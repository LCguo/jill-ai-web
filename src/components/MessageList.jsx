import { Renderer } from '@openuidev/react-lang'
import { chatLibrary } from '../openui/componentLibrary.jsx'

export default function MessageList({ messages, isStreaming, onAction }) {
  return (
    <>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1

        if (msg.role === 'user') {
          return (
            <div key={i} className="message message-user">
              <div className="message-bubble">{msg.content}</div>
            </div>
          )
        }

        return (
          <div key={i} className="message message-assistant">
            <div className="message-bubble">
              <details>
                <summary style={{ cursor: 'pointer', color: '#1677ff', fontSize: 13, marginBottom: 8 }}>
                  Raw OpenUI Lang (click to expand)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  background: '#f5f5f5',
                  padding: 10,
                  borderRadius: 6,
                  fontSize: 12,
                  maxHeight: 200,
                  overflow: 'auto',
                  marginBottom: 12,
                }}>{msg.content || '(empty)'}</pre>
              </details>
              {msg.content ? (
                <div>
                  <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minHeight: 20, marginBottom: 12 }}>
                    <Renderer
                      response={msg.content}
                      library={chatLibrary}
                      isStreaming={isLast && msg.isStreaming}
                      onAction={onAction}
                    />
                  </div>
                  <div style={{ border: '1px solid green', borderRadius: 8, padding: 12, minHeight: 20 }}>
                    <strong style={{ fontSize: 11, color: 'green' }}>Static test:</strong>
                    <Renderer
                      response={'root = Hello("World")'}
                      library={chatLibrary}
                      isStreaming={false}
                      onAction={onAction}
                    />
                  </div>
                </div>
              ) : (
                <span className="cursor-blink"></span>
              )}
              {isLast && msg.isStreaming && msg.content && (
                <span className="cursor-blink"></span>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
