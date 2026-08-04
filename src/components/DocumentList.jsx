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
          <tr><th>文件名</th><th>类型</th><th>大小</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={5} className="doc-empty">加载中…</td></tr>}
          {!loading && docs.length === 0 && <tr><td colSpan={5} className="doc-empty">暂无文档</td></tr>}
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{d.originalName}</td>
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
