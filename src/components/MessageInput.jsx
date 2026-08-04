export default function MessageInput({ input, onChange, onSend, onStop, isStreaming }) {
  return (
    <div className="chat-input-area">
      <input
        type="text"
        placeholder="输入消息..."
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !isStreaming) onSend() }}
        disabled={isStreaming}
      />
      {isStreaming ? (
        <button className="stop-btn" onClick={onStop}>停止</button>
      ) : (
        <button onClick={onSend} disabled={!input.trim()}>发送</button>
      )}
    </div>
  )
}
