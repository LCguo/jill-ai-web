import { useState } from 'react'

export default function CitationList({ citations = [] }) {
  const [open, setOpen] = useState(false)
  if (citations.length === 0) return null
  return (
    <div className="citations">
      <button className="citations-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '收起' : '展开'}引用（{citations.length}）
      </button>
      {open && (
        <ol className="citations-list">
          {citations.map((c, i) => (
            <li key={c.documentId + '-' + (c.chunkId ?? i)} className="citation-item">
              <div className="citation-head">
                <span className="citation-index">[{i + 1}]</span>
                <span className="citation-file">{c.fileName || c.documentId}</span>
                {typeof c.score === 'number' && (
                  <span className="citation-score">score: {c.score.toFixed(2)}</span>
                )}
              </div>
              {c.snippet && <div className="citation-snippet">{c.snippet}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
