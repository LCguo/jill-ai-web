import { useState, useRef, useCallback, useEffect } from 'react'
import { streamChat } from '../api/assistant.js'

let msgSeq = 0

function appendAssistant(setMessages) {
  const id = 'a' + (++msgSeq)
  setMessages((prev) => [...prev, {
    id, role: 'assistant', content: '', isStreaming: true,
    citations: [], evidenceLevel: null, toolCalls: [], error: null,
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

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const send = useCallback((sessionId, message) => {
    const text = (message || '').trim()
    if (!text || isStreaming) return

    setMessages((prev) => [...prev, { id: 'u' + (++msgSeq), role: 'user', content: text }])
    const assistantId = appendAssistant(setMessages)
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    streamChat({
      sessionId,
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
          case 'citation':
            updateLast(setMessages, (m) => ({ ...m, citations: data.citations || [] }))
            break
          case 'evidence':
            updateLast(setMessages, (m) => ({ ...m, evidenceLevel: data.level }))
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
  }, [isStreaming, scrollToBottom])

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

  useEffect(() => () => abortRef.current?.abort(), [])

  return { messages, isStreaming, messagesEndRef, send, stop, clear, assistantId: undefined }
}
