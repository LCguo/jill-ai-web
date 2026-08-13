import { useState } from 'react'

const FILTERS = ['', 'PENDING', 'PARSING', 'READY', 'FAILED']
const FILTER_LABELS = { '': '全部', PENDING: 'PENDING', PARSING: 'PARSING', READY: 'READY', FAILED: 'FAILED' }

function formatSize(bytes) {
  if (bytes == null) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function statusClass(s) {
  return 'doc-status status-' + (s || '').toLowerCase()
}

export default function DocumentList({ docs, loading, statusFilter, onFilter, keyword, onKeyword, onPreview, onDelete }) {
  // 领域过滤为客户端过滤：后端 list 只支持 status 过滤，领域筛选在拿到全部文档后本地做
  const [domainFilter, setDomainFilter] = useState('')
  const all = docs || []
  const domains = [...new Set(all.map((d) => d.docDomain).filter(Boolean))].sort()
  const filtered = domainFilter ? all.filter((d) => d.docDomain === domainFilter) : all

  return (
    <div className="doc-list-wrap">
      <div className="doc-filters">
        {FILTERS.map((f) => (
          <button
            key={f || 'all'}
            className={'filter-btn' + (statusFilter === f ? ' active' : '')}
            onClick={() => onFilter(f)}
          >{FILTER_LABELS[f]}</button>
        ))}
        <select
          className="doc-search doc-domain-select"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          title="按领域筛选"
        >
          <option value="">全部领域</option>
          {domains.map((dm) => <option key={dm} value={dm}>{dm}</option>)}
        </select>
        <input
          className="doc-search"
          type="text"
          placeholder="按文件名搜索"
          value={keyword}
          onChange={(e) => onKeyword(e.target.value)}
        />
      </div>

      <table className="doc-table">
        <thead>
          <tr><th>文件名</th><th>领域</th><th>类型</th><th>大小</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={6} className="doc-empty">加载中…</td></tr>}
          {!loading && filtered.length === 0 && <tr><td colSpan={6} className="doc-empty">暂无文档</td></tr>}
          {filtered.map((d) => (
            <tr key={d.id}>
              <td>{d.originalName}</td>
              <td><span className="doc-domain">{d.docDomain || '-'}</span></td>
              <td>{d.fileType || '-'}</td>
              <td>{formatSize(d.fileSize)}</td>
              <td><span className={statusClass(d.status)}>{d.status}</span></td>
              <td className="doc-actions">
                {d.status === 'READY' && <button onClick={() => onPreview(d)}>预览</button>}
                <button className="doc-delete" onClick={() => onDelete(d.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
