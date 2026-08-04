import { Renderer } from '@openuidev/react-lang'
import { chatLibrary } from '../openui/componentLibrary.jsx'
import ToolCallIndicator from './ToolCallIndicator.jsx'
import CitationList from './CitationList.jsx'
import EvidenceBadge from './EvidenceBadge.jsx'

function AssistantBody({ msg, isLast }) {
  const streaming = isLast && msg.isStreaming
  return (
    <div className="message-bubble">
      {(msg.toolCalls || []).map((t) => (
        <ToolCallIndicator key={t.id} name={t.name} state={t.state} summary={t.summary} />
      ))}
      {msg.evidenceLevel && (
        <div style={{ marginBottom: 8 }}><EvidenceBadge level={msg.evidenceLevel} /></div>
      )}
      {msg.content ? (
        <div className="assistant-openui">
          <Renderer
            response={msg.content}
            library={chatLibrary}
            isStreaming={streaming}
          />
        </div>
      ) : streaming ? (
        <span className="cursor-blink" />
      ) : null}
      {streaming && msg.content ? <span className="cursor-blink" /> : null}
      <CitationList citations={msg.citations} />
      {msg.error && <div className="message-error">{msg.error}</div>}
    </div>
  )
}

export default function MessageList({ messages, isStreaming }) {
  return (
    <>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        if (msg.role === 'user') {
          return (
            <div key={msg.id ?? i} className="message message-user">
              <div className="message-bubble">{msg.content}</div>
            </div>
          )
        }
        return (
          <div key={msg.id ?? i} className="message message-assistant">
            <AssistantBody msg={msg} isLast={isLast} />
          </div>
        )
      })}
    </>
  )
}
