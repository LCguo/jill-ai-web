import { useRef, useState } from 'react'
import { uploadDocument } from '../api/documents.js'
import { buildFullMessage } from '../lib/attachmentRef.js'

export default function MessageInput({ input, onChange, onSend, onStop, isStreaming }) {
  const fileRef = useRef(null)
  const [attachment, setAttachment] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const pickFile = () => { if (!isStreaming && !uploading) fileRef.current?.click() }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploading) return
    setUploading(true)
    setUploadError(null)
    try {
      const doc = await uploadDocument(file, undefined, false)
      setAttachment({ id: doc.id, name: doc.originalName })
    } catch (err) {
      setUploadError(err.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  function handleSend() {
    if (isStreaming) return
    const text = buildFullMessage(input, attachment)
    if (!text) return
    onSend(text)
    setAttachment(null)
  }

  return (
    <div className="chat-input-area">
      <input ref={fileRef} type="file" className="attach-file-input" onChange={handleFileChange} />
      <button
        className="attach-btn"
        onClick={pickFile}
        disabled={isStreaming || uploading}
        title="上传文件"
        aria-label="上传文件"
      >
        {uploading ? '…' : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>
      {uploadError && <div className="attach-error">{uploadError}</div>}
      {attachment && (
        <div className="attach-chip">
          <span className="attach-chip-name" title={attachment.name}>{attachment.name}</span>
          <button className="attach-chip-remove" onClick={() => setAttachment(null)}>&#10005;</button>
        </div>
      )}
      <input
        type="text"
        placeholder="输入消息..."
        value={input}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
        disabled={isStreaming}
      />
      {isStreaming ? (
        <button className="stop-btn" onClick={onStop}>停止</button>
      ) : (
        <button onClick={handleSend} disabled={!buildFullMessage(input, attachment)}>发送</button>
      )}
    </div>
  )
}
