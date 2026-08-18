import { useState, useRef, useCallback, useEffect } from 'react'
import { streamAgentScopeChat, newAgentScopeSession, endAgentScopeSession } from '../api/agentscope.js'

let msgSeq = 0

function appendAssistant(setMessages) {
  const id = 'a' + (++msgSeq)
  setMessages((prev) => [...prev, {
    id, role: 'assistant', content: '', isStreaming: true,
    toolCalls: [], permissions: [], error: null,
  }])
  return id
}

function updateLast(setMessages, fn) {
  setMessages((prev) => {
    if (prev.length === 0) return prev
    const updated = [...prev]
    updated[updated.length - 1] = fn(updated[updated.length - 1])
    return updated
  })
}

/**
 * 与 jill-ai-agent AgentScopeStreamController 配套的流式 Hook
 * 事件协议（后端发，前端消费）:
 *   - delta            { text }              文本增量
 *   - tool_call        { id, name, args? }   工具调用开始
 *   - tool_result      { id, summary? }      工具调用返回
 *   - confirm_required { id, name }          HITL 询问（仅 PermissionMode != BYPASS 时触发）
 *   - finished         {}                    正常结束
 *   - error            { message }           出错
 */
export function useAgentScopeChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // 卸载时关闭会话 + 中止请求
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (sessionId) {
        endAgentScopeSession(sessionId).catch(() => {})
      }
    }
  }, [sessionId])

  const send = useCallback(async (message) => {
    const text = (message || '').trim()
    if (!text || isStreaming) return

    setMessages((prev) => [...prev, { id: 'u' + (++msgSeq), role: 'user', content: text }])
    appendAssistant(setMessages)
    setIsStreaming(true)

    // lazy create session
    let sid = sessionId
    if (!sid) {
      const s = await newAgentScopeSession()
      sid = s.id
      setSessionId(sid)
    }

    const controller = new AbortController()
    abortRef.current = controller

    streamAgentScopeChat({
      sessionId: sid,
      message: text,
      signal: controller.signal,
      onEvent: ({ event, data }) => {
        switch (event) {
          case 'delta':
            updateLast(setMessages, (m) => ({ ...m, content: m.content + (data.text || '') }))
            scrollToBottom()
            break
          case 'tool_call':
            updateLast(setMessages, (m) => ({
              ...m,
              toolCalls: [...m.toolCalls, { id: data.id, name: data.name, state: 'running', summary: '' }],
            }))
            break
          case 'tool_result':
            updateLast(setMessages, (m) => ({
              ...m,
              toolCalls: m.toolCalls.map((t) =>
                t.id === data.id ? { ...t, state: 'done', summary: data.summary || '' } : t),
            }))
            break
          case 'confirm_required':
            // 记录 HITL 询问（仅当 PermissionMode != BYPASS 时才会触发）
            updateLast(setMessages, (m) => ({
              ...m,
              permissions: [
                ...m.permissions,
                { id: data.id, name: data.name || '', ts: Date.now() },
              ],
            }))
            break
          case 'error':
            updateLast(setMessages, (m) => ({
              ...m, error: data.message || '流式响应出错', isStreaming: false,
            }))
            break
          case 'finished':
            updateLast(setMessages, (m) => ({ ...m, isStreaming: false }))
            break
          default:
            break
        }
      },
    }).catch((err) => {
      if (err.name === 'AbortError') return
      updateLast(setMessages, (m) => ({
        ...m, error: err.message || '请求失败', isStreaming: false,
      }))
    }).finally(() => {
      setIsStreaming(false)
      abortRef.current = null
      scrollToBottom()
    })
  }, [isStreaming, sessionId, scrollToBottom])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    updateLast(setMessages, (m) => m.isStreaming ? { ...m, isStreaming: false } : m)
  }, [])

  const clear = useCallback(() => {
    stop()
    setMessages([])
  }, [stop])

  return { messages, isStreaming, sessionId, messagesEndRef, send, stop, clear }
}
