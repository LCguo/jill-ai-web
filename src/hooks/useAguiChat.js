import { useState, useRef, useCallback, useEffect } from 'react'
import { HttpAgent } from '@ag-ui/client'

/**
 * AG-UI 协议客户端 Hook —— 与 jill-ai-agent 的 /agui/run 端点对接
 *
 * AG-UI 事件类型（@ag-ui/core）：
 *   - RUN_STARTED                    run 开始
 *   - TEXT_MESSAGE_START             assistant 文本段开始（生成 messageId）
 *   - TEXT_MESSAGE_CONTENT           增量文本 delta
 *   - TEXT_MESSAGE_END               文本段结束
 *   - TOOL_CALL_START                工具调用开始
 *   - TOOL_CALL_ARGS                 工具参数增量
 *   - TOOL_CALL_END                  工具调用结束
 *   - TOOL_CALL_RESULT               工具结果
 *   - RUN_FINISHED                   run 正常结束
 *   - RUN_ERROR                      run 出错
 *   - STEP_STARTED / STEP_FINISHED   步骤边界
 */
export function useAguiChat({ agentId = 'jill-metric-assistant', url = '/agui/run' } = {}) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [runId, setRunId] = useState(null)
  const [threadId, setThreadId] = useState(null)
  const [error, setError] = useState(null)
  // AG-UI 协议事件流（供「协议监视器」面板展示）
  const [protocolEvents, setProtocolEvents] = useState([])
  const [showProtocol, setShowProtocol] = useState(false)
  const abortRef = useRef(null)
  const agentRef = useRef(null)
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

  // 单例 HttpAgent（连接可复用，但每次 run 是独立请求）
  useEffect(() => {
    agentRef.current = new HttpAgent({
      url,
      agentId,
      headers: { 'X-Agui-Agent-Id': agentId },
    })
    return () => { agentRef.current?.abortRun() }
  }, [agentId, url])

  const send = useCallback(async (userText) => {
    const text = (userText || '').trim()
    if (!text || isStreaming || !agentRef.current) return

    // 新建 thread（每个用户消息用一个新 thread 简化 demo）
    const newThreadId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newRunId = `r-${Date.now()}`
    setThreadId(newThreadId)
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
    }

    // 用 run(input) 直接传完整 RunAgentInput（含 messages）——
    // runAgent(parameters) 的 RunAgentParameters 不含 messages，会导致消息丢失
    const input = {
      threadId: newThreadId,
      runId: newRunId,
      state: {},
      messages: [
        { id: userMsgId, role: 'user', content: text },
      ],
    }

    try {
      await new Promise((resolve, reject) => {
        const subscription = agentRef.current.run(input).subscribe({
          next: (event) => {
        // 记录 AG-UI 协议事件（监视器面板用）—— 高频文本 delta 抽样记录
        if (event.type === 'TEXT_MESSAGE_CONTENT') {
          deltaCount.current++
          if (deltaCount.current % 8 === 1 || deltaCount.current === 1) {
            pushEvent({ type: event.type, threadId, runId: newRunId, ...event })
          }
        } else {
          pushEvent({ type: event.type, threadId, runId: newRunId, ...event })
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
            current.toolCallId = null
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
      },
      error: (err) => {
        if (err?.name !== 'AbortError') {
          setError(err?.message || String(err))
          updateLastAssistant(m => ({ isStreaming: false, error: err?.message || String(err) }))
        }
        reject(err)
      },
      complete: () => {
        resolve()
      },
    })
        abortRef.current = { dispose: () => subscription.unsubscribe() }
      })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || String(err))
        updateLastAssistant(m => ({ isStreaming: false, error: err?.message || String(err) }))
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [isStreaming])

  const stop = useCallback(() => {
    agentRef.current?.abortRun()
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
