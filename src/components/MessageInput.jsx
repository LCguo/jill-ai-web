export default function MessageInput({ input, onChange, onSend, isStreaming }) {
  return (
    <div className="chat-input-area">
      <input
        type="text"
        placeholder="输入消息..."
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSend() }}
        disabled={isStreaming}
      />
      <button onClick={onSend} disabled={isStreaming || !input.trim()}>
        {isStreaming ? '回答中...' : '发送'}
      </button>
    </div>
  )
}
