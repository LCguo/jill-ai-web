import { useState, useRef, useCallback } from 'react'

/**
 * 前端暴露给 agent 的可用工具（AG-UI 前端工具机制）。
 * 通过请求体 extras.availableTools 传给后端，AgentScope 会按
 * ToolMergeMode.MERGE_FRONTEND_PRIORITY 注入到 agent 工具集。
 * 对 render_chart：agent 端注册了同名实现（ChartRenderTool），
 * 前端在 TOOL_CALL_END 时真正渲染 ECharts。
 */
const AVAILABLE_TOOLS = [
  {
    name: 'render_chart',
    description: '在聊天区渲染一个数据可视化图表。当用户问"排名 / 趋势 / 占比 / 对比 / 分布"等可以用图形更直观表达的问题时，你**必须**调用此工具（而不是只用 markdown 表格）。图表类型：bar=柱状, line=折线, pie=饼图, area=面积, scatter=散点。',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['bar', 'line', 'pie', 'area', 'scatter'],
          description: '图表类型：bar=柱状, line=折线, pie=饼图, area=面积, scatter=散点',
        },
        title: {
          type: 'string',
          description: '图表标题',
        },
        xAxis: {
          type: 'array',
          items: { type: 'string' },
          description: 'X 轴分类标签（柱状/折线/面积用），如日期或区域名',
        },
        series: {
          type: 'array',
          description: '数据系列。每个元素形如 { name: "指标名", data: [数值, ...] }。',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              data: { type: 'array', items: { type: 'number' } },
            },
          },
        },
        pieData: {
          type: 'array',
          description: '饼图专用：[{ name: "区域", value: 销售额 }, ...]',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'number' },
            },
          },
        },
        horizontal: {
          type: 'boolean',
          description: '柱状图是否水平展示（横向条形图）',
        },
      },
      required: ['type', 'title'],
    },
  },
]

/**
 * AG-UI 协议客户端 Hook —— 使用前端 SDK 标准参数格式
 *
 * 请求体：
 * {
 *   "sessionId": "t-xxx",                    // 会话 ID
 *   "textContent": "用户问题",                // 用户文本
 *   "forwardedProps": { "agentName": "..." },// 转发属性（agent 名）
 *   "extras": { "availableTools": [ ... ] }, // 前端可用工具
 *   "fileIds": []
 * }
 *
 * 响应为 SSE 事件流（AG-UI 协议事件）：
 *   RUN_STARTED / TEXT_MESSAGE_START/CONTENT/END /
 *   TOOL_CALL_START/ARGS/END/RESULT / RUN_FINISHED / RUN_ERROR
 */
export function useAguiChat({ agentId = 'jill-metric-assistant', url = '/agui/compat/run' } = {}) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [runId, setRunId] = useState(null)
  const [threadId, setThreadId] = useState(null)
  const [error, setError] = useState(null)
  // AG-UI 协议事件流（供「协议监视器」面板展示）
  const [protocolEvents, setProtocolEvents] = useState([])
  const [showProtocol, setShowProtocol] = useState(false)
  const abortRef = useRef(null)
  const eventSeq = useRef(0)
  const deltaCount = useRef(0)

  // 记录一个 AG-UI 事件（简单限流：单条 delta 合并，最多保留 300 条）
  const pushEvent = useCallback((evt) => {
    setProtocolEvents(prev => {
      const entry = { ...evt, seq: ++eventSeq.current, ts: Date.now() }
      const next = [...prev, entry]
      return next.length > 300 ? next.slice(next.length - 300) : next
    })
  }, [])

  // 解析 SSE 流：data: {...} 每行一个 JSON
  async function* parseSSE(response) {
    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (line.startsWith('data:')) {
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue
          try { yield JSON.parse(payload) } catch { /* 忽略无法解析的行 */ }
        }
      }
    }
    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().slice(5).trim()
      if (payload && payload !== '[DONE]') {
        try { yield JSON.parse(payload) } catch { /* ignore */ }
      }
    }
  }

  const send = useCallback(async (userText) => {
    const text = (userText || '').trim()
    if (!text || isStreaming) return

    // 新建会话（每个用户消息一个新 sessionId 简化 demo）
    const newSessionId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newRunId = `r-${Date.now()}`
    setThreadId(newSessionId)
    setRunId(newRunId)
    setError(null)

    // 加 user 消息 + assistant 占位
    const userMsgId = `u-${Date.now()}`
    const assistantMsgId = `a-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        toolCalls: [],   // { id, name, args, result, state }
        isStreaming: true,
      },
    ])
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    const updateLastAssistant = (mutator) => {
      setMessages(prev => {
        const updated = [...prev]
        // 找到最后一个 assistant 消息
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].role === 'assistant') {
            updated[i] = { ...updated[i], ...mutator(updated[i]) }
            break
          }
        }
        return updated
      })
    }

    // 当前 assistant 消息的 messageId / toolCallId 状态
    const current = {
      messageId: null,    // AG-UI TEXT_MESSAGE_START 给的 messageId
      toolCallId: null,   // AG-UI TOOL_CALL_START 给的 toolCallId
      toolCallName: null, // 当前工具名（TOOL_CALL_END 不带名字，需要从 START 记录）
    }

    // 前端 SDK 标准参数格式
    const body = {
      sessionId: newSessionId,
      textContent: text,
      forwardedProps: { agentName: agentId },
      extras: { availableTools: AVAILABLE_TOOLS },
      fileIds: [],
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      for await (const event of parseSSE(response)) {
        // 记录 AG-UI 协议事件（监视器面板用）—— 高频文本 delta 抽样记录
        if (event.type === 'TEXT_MESSAGE_CONTENT') {
          deltaCount.current++
          if (deltaCount.current % 8 === 1 || deltaCount.current === 1) {
            pushEvent({ type: event.type, threadId: newSessionId, runId: newRunId, ...event })
          }
        } else {
          pushEvent({ type: event.type, threadId: newSessionId, runId: newRunId, ...event })
        }

        switch (event.type) {
          case 'RUN_STARTED':
            break
          case 'TEXT_MESSAGE_START':
            current.messageId = event.messageId
            break
          case 'TEXT_MESSAGE_CONTENT':
            updateLastAssistant(m => ({ content: m.content + (event.delta || '') }))
            break
          case 'TEXT_MESSAGE_END':
            current.messageId = null
            break
          case 'TOOL_CALL_START':
            current.toolCallId = event.toolCallId
            current.toolCallName = event.toolCallName || ''
            updateLastAssistant(m => ({
              toolCalls: [
                ...m.toolCalls,
                {
                  id: event.toolCallId,
                  name: event.toolCallName || '',
                  args: '',
                  result: '',
                  state: 'running',
                },
              ],
            }))
            break
          case 'TOOL_CALL_ARGS':
            updateLastAssistant(m => ({
              toolCalls: m.toolCalls.map(t =>
                t.id === current.toolCallId
                  ? { ...t, args: t.args + (event.delta || '') }
                  : t
              ),
            }))
            break
          case 'TOOL_CALL_END':
            // 前端工具：TOOL_CALL_END 时前端渲染图表（agent 端实现会返回结果，
            // TOOL_CALL_RESULT 也会触发 done；这里提前标记避免等待）
            if (current.toolCallName === 'render_chart') {
              updateLastAssistant(m => ({
                toolCalls: m.toolCalls.map(t =>
                  t.id === event.toolCallId
                    ? { ...t, result: 'rendered', state: 'done' }
                    : t
                ),
              }))
            }
            current.toolCallId = null
            current.toolCallName = null
            break
          case 'TOOL_CALL_RESULT':
            updateLastAssistant(m => ({
              toolCalls: m.toolCalls.map(t =>
                t.id === event.toolCallId
                  ? { ...t, result: event.content || event.delta || '', state: 'done' }
                  : t
              ),
            }))
            break
          case 'RUN_FINISHED':
            updateLastAssistant(() => ({ isStreaming: false }))
            break
          case 'RUN_ERROR':
            setError(event.message || 'AG-UI run error')
            updateLastAssistant(m => ({ isStreaming: false, error: event.message }))
            break
          default:
            break
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || String(err))
        updateLastAssistant(m => ({ isStreaming: false, error: err?.message || String(err) }))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [isStreaming, agentId, url])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setMessages(prev => {
      const updated = [...prev]
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'assistant' && updated[i].isStreaming) {
          updated[i] = { ...updated[i], isStreaming: false }
          break
        }
      }
      return updated
    })
  }, [])

  const clear = useCallback(() => {
    stop()
    setMessages([])
    setError(null)
    setThreadId(null)
    setRunId(null)
    setProtocolEvents([])
    eventSeq.current = 0
    deltaCount.current = 0
  }, [stop])

  const toggleProtocol = useCallback(() => setShowProtocol(v => !v), [])

  return {
    messages, isStreaming, threadId, runId, error, send, stop, clear,
    protocolEvents, showProtocol, toggleProtocol,
  }
}
