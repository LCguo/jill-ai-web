import { useEffect, useState } from 'react'
import { previewDocumentUrl } from '../api/documents.js'

export default function DocumentPreview({ doc, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doc) return
    let cancelled = false
    setLoading(true)
    fetch(previewDocumentUrl(doc.id))
      .then((r) => r.text())
      .then((t) => { if (!cancelled) { setText(t); setLoading(false) } })
      .catch(() => { if (!cancelled) { setText('预览加载失败'); setLoading(false) } })
    return () => { cancelled = true }
  }, [doc])

  if (!doc) return null
  return (
    <div className="preview-drawer" onClick={onClose}>
      <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <span>{doc.originalName}</span>
          <button onClick={onClose}>关闭</button>
        </div>
        <pre className="preview-body">{loading ? '加载中…' : text}</pre>
      </div>
    </div>
  )
}
