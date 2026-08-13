import { useRef, useState } from 'react'

export default function DocumentUploader({ onUpload }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [domain, setDomain] = useState('')

  async function handleFile(file) {
    if (!file || busy) return
    setBusy(true); setError(null)
    try {
      await onUpload?.(file, domain.trim() || undefined)
    } catch (e) {
      setError(e.message || '上传失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="uploader-domain-row">
        <label className="uploader-domain-label">领域</label>
        <input
          className="uploader-domain"
          type="text"
          placeholder="留空默认 business_assistant"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </div>
      <div
        className={'uploader' + (dragging ? ' dragging' : '')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef} type="file" style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <div>{busy ? '上传中…' : '点击或拖拽文件到此处上传'}</div>
        <div className="uploader-hint">支持 PDF / DOCX / MD / TXT</div>
        {error && <div className="message-error">{error}</div>}
      </div>
    </div>
  )
}
