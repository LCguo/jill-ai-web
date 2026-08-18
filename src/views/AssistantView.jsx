import { useEffect, useState } from 'react'
import SessionSidebar from '../components/SessionSidebar.jsx'
import MessageList from '../components/MessageList.jsx'
import MessageInput from '../components/MessageInput.jsx'
import ModeSwitcher from '../components/ModeSwitcher.jsx'
import { useChat } from '../hooks/useChat.js'
import { useSessions } from '../hooks/useSessions.js'
import { SessionProvider } from '../stores/SessionContext.jsx'

export default function AssistantView() {
  // SessionProvider 局部包在这里：旧的 SAA 会话 API（/api/assistant/sessions）已废弃，
  // 后端返回 404（SessionContext 已做静默降级）。不影响其它页面（AG-UI 等）。
  return (
    <SessionProvider>
      <AssistantViewInner />
    </SessionProvider>
  )
}

function AssistantViewInner() {
  const [input, setInput] = useState('')
  const { messages, isStreaming, messagesEndRef, send, stop, clear } = useChat()
  const { current, create, setMode } = useSessions()

  // 切换会话时清空当前页消息（历史回放后续增强）
  useEffect(() => { clear() }, [current?.id, clear])

  function ensureSessionAndSend(message) {
    const text = (message || input).trim()
    if (!text || isStreaming) return
    const doSend = (id) => { send(id, text); setInput('') }
    if (current) {
      doSend(current.id)
    } else {
      create({ mode: 'CHAT' }).then((s) => doSend(s.id))
    }
  }

  return (
    <div className="assistant-layout">
      <SessionSidebar />
      <div className="chat-container assistant-chat">
        <header className="chat-header">
          <ModeSwitcher
            value={current?.mode || 'CHAT'}
            disabled={isStreaming}
            onChange={(mode) => current && setMode(current.id, mode)}
          />
          <button className="clear-btn" onClick={clear} disabled={isStreaming}>&#8634; 清空</button>
        </header>
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state"><p>{current ? '发送消息开始对话' : '新建会话或选择左侧会话开始'}</p></div>
          ) : (
            <MessageList messages={messages} isStreaming={isStreaming} />
          )}
          <div ref={messagesEndRef} />
        </div>
        <MessageInput
          input={input}
          onChange={setInput}
          onSend={ensureSessionAndSend}
          onStop={stop}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}
