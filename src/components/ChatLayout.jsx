import { useState } from 'react'
import { useChat } from '../hooks/useChat.js'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'

export default function ChatLayout() {
  const [input, setInput] = useState('')
  const { messages, isStreaming, messagesEndRef, send, clear } = useChat()

  function handleSend() {
    if (!input.trim() || isStreaming) return
    send(input)
    setInput('')
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Jill AI Chat</h2>
        <button className="clear-btn" onClick={clear} disabled={isStreaming}>
          &#8634; 清空
        </button>
      </header>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>发送消息开始对话</p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            onAction={(evt) => console.log('Form action:', evt)}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        input={input}
        onChange={setInput}
        onSend={handleSend}
        isStreaming={isStreaming}
      />
    </div>
  )
}
