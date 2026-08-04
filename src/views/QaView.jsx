import { useState } from 'react'
import { ask } from '../api/qa.js'
import CitationList from '../components/CitationList.jsx'
import EvidenceBadge from '../components/EvidenceBadge.jsx'
import MarkdownText from '../components/MarkdownText.jsx'

export default function QaView() {
  const [question, setQuestion] = useState('')
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function submit() {
    const q = question.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await ask({ question: q, domain: domain.trim() || undefined }))
    } catch (e) {
      setError(e.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qa-page">
      <h2>知识库问答</h2>
      <div className="qa-input-row">
        <input
          className="qa-question"
          type="text"
          placeholder="输入问题，如：文档上传流程是怎样的？"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          disabled={loading}
        />
        <input
          className="qa-domain"
          type="text"
          placeholder="领域（可选）"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          disabled={loading}
        />
        <button onClick={submit} disabled={loading || !question.trim()}>
          {loading ? '提问中…' : '提问'}
        </button>
      </div>

      {error && <div className="message-error">{error}</div>}

      {result && (
        <div className="qa-result">
          <div style={{ marginBottom: 8 }}><EvidenceBadge level={result.evidenceLevel} /></div>
          {result.answered ? (
            <>
              <div className="qa-answer"><MarkdownText text={result.answer} /></div>
              <CitationList citations={result.citations} />
            </>
          ) : (
            <div className="qa-rejected">
              <div className="qa-rejected-title">未找到足够依据，无法回答</div>
              {result.reason && <div className="qa-rejected-reason">{result.reason}</div>}
              <div className="qa-rejected-hint">建议换个关键词，或到文档管理上传相关资料后再试。</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
