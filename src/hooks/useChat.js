import { useState, useRef, useCallback, useEffect } from 'react'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const eventSourceRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const send = useCallback((message) => {
    if (!message.trim() || isStreaming) return

    const newMessages = [
      ...messages,
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: '', isStreaming: true }
    ]
    setMessages(newMessages)
    setIsStreaming(true)
    scrollToBottom()

    const url = `/api/agent/react/stream?message=${encodeURIComponent(message.trim())}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onmessage = (e) => {
      if (e.data) {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + e.data
            }
          }
          return updated
        })
        scrollToBottom()
      }
    }

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            isStreaming: false,
            content: last.content || '(请求失败，请稍后重试)'
          }
        }
        return updated
      })
      setIsStreaming(false)
      scrollToBottom()
    }
  }, [messages, isStreaming, scrollToBottom])

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
    setMessages(prev => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last && last.isStreaming) {
        updated[updated.length - 1] = { ...last, isStreaming: false }
      }
      return updated
    })
  }, [])

  const clear = useCallback(() => {
    stop()
    setMessages([])
  }, [stop])

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  return { messages, isStreaming, messagesEndRef, send, stop, clear }
}
