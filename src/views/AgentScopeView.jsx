import { useState, useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'
import * as echarts from 'echarts'
import { useAguiChat } from '../hooks/useAguiChat.js'

const EXAMPLES = [
  '查询 2026-05-01 到 2026-05-10 的每日订单数',
  '5 月份各区域销售额排名',
  '销售额最高的前 3 个产品',
  '查一下华为的机构编号，再查它的 KPI 趋势',
  '现在几点了？',
]

const TOOL_LABELS = {
  find_metric: '语义检索指标',
  lookup_org: '查询机构编号',
  search_knowledge: '检索知识库',
  hybrid_search: '混合检索',
  list_allowed_tables: '可查询表',
  get_table_schema: '表结构',
  execute_sql: '执行 SQL',
  read_document_content: '读取文档',
  daily_order_count: '每日订单数',
  sales_by_region: '按区域销售',
  top_products: '热销产品',
  kpi_trend: 'KPI 趋势',
  get_current_time: '当前时间',
  render_chart: '📊 图表',
}

function tryParseJsonArgs(args) {
  // 兼容 args 是 JSON 字符串或对象
  if (!args) return {}
  if (typeof args === 'object') return args
  try { return JSON.parse(args) } catch { return {} }
}

/* ---------- ECharts 图表渲染（前端工具 render_chart 的真正执行） ---------- */
function ChartView({ spec }) {
  const ref = useRef(null)
  const instRef = useRef(null)

  const option = useMemo(() => {
    if (!spec) return null
    const {
      type = 'bar', title = '', xAxis = [], series = [],
      pieData = [], horizontal = false,
    } = spec

    // 配色调色板（沿用页面 accent + 几个柔和色）
    const palette = ['#7c5cff', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#f472b6', '#22d3ee']

    if (type === 'pie') {
      return {
        title: title ? { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 500, color: '#1a1a1a' } } : undefined,
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: 0, textStyle: { fontSize: 11, color: '#666' } },
        series: [{
          type: 'pie',
          radius: ['38%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#1a1a1a' },
          data: pieData.map((d, i) => ({ ...d, itemStyle: { color: palette[i % palette.length] } })),
        }],
      }
    }

    // bar / line / area / scatter 共用坐标系
    const isArea = type === 'area'
    const isLine = type === 'line' || isArea
    const chartType = isLine ? 'line' : type

    return {
      title: title ? { text: title, left: 'center', textStyle: { fontSize: 14, fontWeight: 500, color: '#1a1a1a' } } : undefined,
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#666' } },
      grid: { top: title ? 40 : 16, left: 8, right: 16, bottom: 36, containLabel: true },
      xAxis: horizontal
        ? { type: 'value' }
        : { type: 'category', data: xAxis, axisLabel: { color: '#666', fontSize: 11 }, axisLine: { lineStyle: { color: '#e5e7eb' } } },
      yAxis: horizontal
        ? { type: 'category', data: xAxis, axisLabel: { color: '#666', fontSize: 11 }, axisLine: { lineStyle: { color: '#e5e7eb' } } }
        : { type: 'value', axisLabel: { color: '#666', fontSize: 11 }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      series: series.map((s, i) => ({
        name: s.name,
        type: chartType,
        data: s.data,
        smooth: isLine,
        symbol: isLine ? 'circle' : undefined,
        symbolSize: isLine ? 6 : undefined,
        areaStyle: isArea ? { opacity: 0.15 } : undefined,
        itemStyle: { color: palette[i % palette.length], borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        lineStyle: isLine ? { width: 2, color: palette[i % palette.length] } : undefined,
        barMaxWidth: 36,
      })),
    }
  }, [spec])

  useEffect(() => {
    if (!ref.current || !option) return
    if (!instRef.current) {
      instRef.current = echarts.init(ref.current, null, { renderer: 'canvas' })
    }
    instRef.current.setOption(option, true)
    const onResize = () => instRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [option])

  useEffect(() => () => { instRef.current?.dispose(); instRef.current = null }, [])

  return <div ref={ref} className="dsh-chart" />
}

function tryPrettyJson(s) {
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}
function truncate(s, n) {
  if (typeof s !== 'string') s = String(s)
  return s.length > n ? s.slice(0, n) + '…' : s
}

/* ---------- 左侧文档管理面板 ---------- */
function DocSidebar({ onClose }) {
  const [stats, setStats] = useState(null)
  const [domain, setDomain] = useState('')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [resultsMode, setResultsMode] = useState('empty') // 'empty' | 'search' | 'list'
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [okMsg, setOkMsg] = useState(null)
  const fileRef = useRef(null)

  // 拉统计 + 自动选中第一个有内容的域
  const [statsLoaded, setStatsLoaded] = useState(false)
  useEffect(() => {
    fetch('/api/vector/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setStats(d)
        setStatsLoaded(true)
        // 选中第一个 documentCount > 0 的域
        const domains = d.domains ? Object.values(d.domains) : []
        const first = domains.find(x => (x.documentCount || 0) > 0) || domains[0]
        if (first) setDomain(first.domain)
      })
      .catch(() => setStatsLoaded(true))
  }, [uploading, busy])

  function doSearch(e) {
    e?.preventDefault?.()
    if (!query.trim()) {
      setResults([])
      setResultsMode('empty')
      return
    }
    setSearching(true)
    setErr(null)
    setResultsMode('search')
    fetch('/api/vector/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, query, topK: 10 }),
    })
      .then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t || '搜索失败') }))
      .then(d => setResults(d.hits || d.documents || d.results || (Array.isArray(d) ? d : [])))
      .catch(e => setErr(String(e.message || e)))
      .finally(() => setSearching(false))
  }

  function doListAll() {
    setSearching(true)
    setErr(null)
    setResultsMode('list')
    fetch(`/api/vector/domains/${encodeURIComponent(domain)}/documents?offset=0&limit=100`)
      .then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t || '列出失败') }))
      .then(d => {
        const arr = Array.isArray(d) ? d : (d.documents || d.items || [])
        setResults(arr)
      })
      .catch(e => setErr(String(e.message || e)))
      .finally(() => setSearching(false))
  }

  function doDelete(docId) {
    if (!confirm(`确定删除文档 "${docId}"？此操作不可撤销。`)) return
    setBusy(true)
    setErr(null)
    fetch(`/api/vector/domains/${encodeURIComponent(domain)}/documents/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    })
      .then(r => { if (!r.ok) throw new Error('删除失败 ' + r.status) })
      .then(() => {
        setOkMsg(`已删除 ${docId}`)
        setResults(prev => prev.filter(d => (d.id || d.documentId) !== docId))
        setTimeout(() => setOkMsg(null), 2000)
      })
      .catch(e => setErr(String(e.message || e)))
      .finally(() => setBusy(false))
  }

  function doUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setErr(null)
    const form = new FormData()
    form.append('file', file)
    if (domain) form.append('docDomain', domain)
    fetch('/api/documents/upload', { method: 'POST', body: form })
      .then(r => r.ok ? r.json() : r.text().then(t => { throw new Error(t || '上传失败') }))
      .then(d => {
        setOkMsg(`已上传 ${d.originalName || file.name}（状态：${d.status || 'uploaded'}，解析中…）`)
        setTimeout(() => setOkMsg(null), 3000)
        // 上传后刷新列表
        if (resultsMode === 'list') doListAll()
      })
      .catch(e => setErr(String(e.message || e)))
      .finally(() => setUploading(false))
  }

  return (
    <aside className="dsh-sidebar">
      <div className="dsh-side-head">
        <div className="dsh-side-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span>文档库</span>
        </div>
        {statsLoaded && stats?.domains && Object.keys(stats.domains).length > 0 ? (
          <select
            className="dsh-domain-select"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            title="向量域（domain）"
          >
            {Object.entries(stats.domains).map(([k, v]) => (
              <option key={k} value={k}>{k} ({v.documentCount})</option>
            ))}
          </select>
        ) : (
          <input
            className="dsh-domain-input"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            title="向量域（domain）"
            placeholder="domain"
          />
        )}
      </div>

      {/* 统计 */}
      <div className="dsh-stats">
        {stats ? (
          <>
            <div className="dsh-stat">
              <div className="dsh-stat-num">{stats.totalDocuments ?? stats.documentCount ?? '—'}</div>
              <div className="dsh-stat-label">文档</div>
            </div>
            <div className="dsh-stat">
              <div className="dsh-stat-num">{stats.totalChunks ?? stats.chunkCount ?? '—'}</div>
              <div className="dsh-stat-label">分片</div>
            </div>
            <div className="dsh-stat">
              <div className="dsh-stat-num">{stats.domainCount ?? (Object.keys(stats.domains || {}).length || '—')}</div>
              <div className="dsh-stat-label">域</div>
            </div>
          </>
        ) : (
          <div className="dsh-stats-loading">加载统计…</div>
        )}
      </div>

      {/* 搜索 + 列出全部 */}
      <form className="dsh-search" onSubmit={doSearch}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜索文档内容…"
        />
      </form>
      <div className="dsh-side-actions">
        <button className="dsh-side-action" onClick={doListAll} disabled={!domain || searching}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          列出全部
        </button>
        {resultsMode !== 'empty' && (
          <button className="dsh-side-action ghost" onClick={() => { setResults([]); setResultsMode('empty'); setQuery('') }}>
            清空
          </button>
        )}
      </div>

      {/* 操作消息 */}
      {err && <div className="dsh-side-msg error">⚠ {err}</div>}
      {okMsg && <div className="dsh-side-msg ok">✓ {okMsg}</div>}

      {/* 列表 */}
      <div className="dsh-doc-list">
        {searching ? (
          <div className="dsh-doc-empty">加载中…</div>
        ) : results.length === 0 ? (
          <div className="dsh-doc-empty">
            {resultsMode === 'list' ? '此域下没有文档' : '输入关键词搜索，或点击"列出全部"'}
          </div>
        ) : (
          results.map(doc => {
            const id = doc.documentId || doc.id
            // metadata 可能是对象也可能是 JSON 字符串
            let meta = doc.metadata
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta) } catch { meta = {} }
            }
            const title = meta?.originalName || doc.title || doc.documentId || doc.id
            const snippet = doc.content || doc.snippet || doc.text || doc.bestSnippet || ''
            const score = doc.score != null ? doc.score.toFixed(3) : null
            return (
              <div className="dsh-doc-item" key={id}>
                <div className="dsh-doc-head">
                  <span className="dsh-doc-title" title={title}>{title}</span>
                  {score != null && <span className="dsh-doc-score">{score}</span>}
                  {doc.status && <span className={`dsh-doc-status dsh-doc-status-${(doc.status || '').toLowerCase()}`}>{doc.status}</span>}
                  <button className="dsh-doc-del" onClick={() => doDelete(id)} disabled={busy} title="删除">×</button>
                </div>
                {snippet && <div className="dsh-doc-snippet">{truncate(snippet, 120)}</div>}
              </div>
            )
          })
        )}
      </div>

      {/* 上传文档（固定底部） */}
      <div className="dsh-side-footer">
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={doUpload}
          accept=".txt,.md,.pdf,.doc,.docx,.json,.csv,.log,text/*"
        />
        <button className="dsh-add-doc" onClick={() => fileRef.current?.click()} disabled={!domain || uploading}>
          {uploading ? (
            <><span className="dsh-spinner" /> 解析中…</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>上传文档到 {domain || '...'}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

/* ---------- 工具调用（内联 chip） ---------- */
function ToolCall({ tool }) {
  const isRunning = tool.state === 'running'

  // 特殊处理：render_chart 是前端工具 → 直接渲染图表，不显示 JSON
  if (tool.name === 'render_chart' && !isRunning) {
    const spec = tryParseJsonArgs(tool.args)
    return (
      <div className="tool tool-done tool-chart">
        <div className="tool-header">
          <span className="tool-name">📊 图表 · {spec.type || 'bar'}</span>
          <span className="tool-status done">已渲染</span>
        </div>
        <ChartView spec={spec} />
        <details className="tool-detail">
          <summary>查看参数</summary>
          <pre>{tryPrettyJson(tool.args)}</pre>
        </details>
      </div>
    )
  }

  return (
    <div className={`tool tool-${tool.state}`}>
      <div className="tool-header">
        <span className="tool-name">{TOOL_LABELS[tool.name] || tool.name}</span>
        {isRunning ? <span className="tool-status running">运行中</span> : <span className="tool-status done">完成</span>}
      </div>
      {(tool.args || tool.result) && (
        <details className="tool-detail" open={!isRunning}>
          <summary>{isRunning ? '参数' : '详情'}</summary>
          {tool.args && <pre>{tryPrettyJson(tool.args)}</pre>}
          {tool.result && <pre className="tool-result-pre">{truncate(tool.result, 1200)}</pre>}
        </details>
      )}
    </div>
  )
}

/* ---------- 消息气泡 ---------- */
function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="msg-content user-content">
          <div className="msg-text">{msg.content}</div>
        </div>
      </div>
    )
  }
  const html = useMemo(() => {
    try { return marked.parse(msg.content || '', { breaks: true, gfm: true }) }
    catch { return msg.content || '' }
  }, [msg.content])
  return (
    <div className="msg msg-assistant">
      <div className="avatar assistant-avatar">AI</div>
      <div className="msg-content assistant-content">
        {(msg.toolCalls || []).map(t => <ToolCall key={t.id} tool={t} />)}
        {msg.content ? (
          <div className="markdown-body msg-text" dangerouslySetInnerHTML={{ __html: html }} />
        ) : msg.isStreaming ? <span className="typing-dot" /> : null}
        {msg.isStreaming && msg.content && <span className="typing-dot" />}
        {msg.error && <div className="msg-error">{msg.error}</div>}
      </div>
    </div>
  )
}

/* ---------- 输入区 ---------- */
function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)
  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text); setValue(''); ref.current?.focus()
  }
  return (
    <div className={`chat-input ${disabled ? 'chat-input-disabled' : ''}`}>
      <textarea
        ref={ref}
        value={value}
        placeholder="发消息给 AI 助手…（Shift + Enter 换行，Enter 发送）"
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        disabled={disabled}
        rows={1}
        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px' }}
      />
      <button
        className={`send-btn ${disabled ? 'stop' : ''}`}
        onClick={disabled ? undefined : submit}
        disabled={!disabled && !value.trim()}
        title={disabled ? '停止' : '发送'}
      >
        {disabled ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        )}
      </button>
    </div>
  )
}

/* ---------- AG-UI 协议监视器 ---------- */
function fmtTs(ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}
function ProtocolMonitor({ events, open, onClose }) {
  const logRef = useRef(null)
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [events])
  const colorFor = t => {
    if (t.startsWith('RUN_')) return 'var(--dsh-accent)'
    if (t.startsWith('TOOL_CALL')) return 'var(--dsh-info)'
    if (t.startsWith('TEXT_MESSAGE')) return 'var(--dsh-text-dim)'
    return 'var(--dsh-text-faint)'
  }
  const brief = evt => {
    const parts = []
    if (evt.delta !== undefined) parts.push(`delta: ${JSON.stringify(String(evt.delta).slice(0, 40))}${String(evt.delta).length > 40 ? '…' : ''}`)
    if (evt.toolCallName) parts.push(`tool: ${evt.toolCallName}`)
    if (evt.toolCallId) parts.push(`id: ${String(evt.toolCallId).slice(0, 18)}`)
    if (evt.messageId) parts.push(`msg: ${String(evt.messageId).slice(0, 10)}`)
    if (evt.content !== undefined) parts.push(`len: ${String(evt.content).length}`)
    if (evt.role) parts.push(`role: ${evt.role}`)
    return parts.join('  ')
  }
  return (
    <div className={`protocol-panel ${open ? 'open' : ''}`}>
      <div className="protocol-head">
        <span className="protocol-title">AG-UI 事件流</span>
        <button className="protocol-close" onClick={onClose} aria-label="关闭">×</button>
      </div>
      <div className="protocol-body" ref={logRef}>
        {events.length === 0 ? (
          <div className="protocol-empty">尚无协议事件，发送消息后此处将实时滚动 AG-UI 事件</div>
        ) : events.map(evt => (
          <div className="protocol-line" key={evt.seq}>
            <span className="protocol-seq">{String(evt.seq).padStart(3, '0')}</span>
            <span className="protocol-ts">{fmtTs(evt.ts)}</span>
            <span className="protocol-type" style={{ color: colorFor(evt.type) }}>{evt.type}</span>
            <span className="protocol-brief">{brief(evt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 主视图 ---------- */
export default function AgentScopeView() {
  const { messages, isStreaming, threadId, error, send, clear, protocolEvents, showProtocol, toggleProtocol } = useAguiChat()
  const listRef = useRef(null)
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])
  useEffect(() => () => clear(), [clear])

  return (
    <div className="dsh-page">
      <div className="dsh-topbar">
        <div className="dsh-topbar-left">
          <div className="dsh-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="dsh-title">
            <div className="dsh-title-main">Jill AI 助手</div>
            <div className="dsh-title-sub">业务指标查询 · AgentScope + DeepSeek + MCP</div>
          </div>
        </div>
        <div className="dsh-topbar-right">
          <div className="dsh-model-tag">deepseek-chat</div>
          <div className="dsh-thread-info">
            <span className="dsh-thread-label">thread</span>
            <code className="dsh-thread-id">{threadId ? threadId.slice(0, 12) + '…' : '尚未开始'}</code>
          </div>
          <button className={`dsh-icon-btn ${showProtocol ? 'active' : ''}`} onClick={toggleProtocol} title="查看 AG-UI 协议事件流">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            {protocolEvents.length > 0 && <span className="dsh-badge">{protocolEvents.length}</span>}
          </button>
          <button className="dsh-icon-btn" onClick={clear} disabled={isStreaming} title="新建会话">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="dsh-layout">
        <DocSidebar />
        <div className="dsh-main">
          <ProtocolMonitor events={protocolEvents} open={showProtocol} onClose={toggleProtocol} />

          <div className="dsh-messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="dsh-empty">
                <h1 className="dsh-empty-title">有什么可以帮你的？</h1>
                <p className="dsh-empty-sub">用自然语言描述你的业务问题，AI 会自动调用相应的工具完成查询。<br />也可以左侧上传业务文档，让 AI 参考回答。</p>
                <div className="dsh-examples">
                  {EXAMPLES.map((e, i) => (
                    <button key={i} className="dsh-example" onClick={() => send(e)} disabled={isStreaming}>
                      <span className="dsh-example-icon">→</span>
                      <span>{e}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="dsh-conversation">
                {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
                {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                  <div className="msg msg-assistant">
                    <div className="avatar assistant-avatar">AI</div>
                    <div className="msg-content assistant-content"><span className="typing-dot" /></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 聊天输入：固定在底部（跨整个右主区） */}
        <div className="dsh-input-bar">
          <div className="dsh-input-bar-inner">
            <ChatInput onSend={send} disabled={isStreaming} />
            <div className="dsh-input-hint">AI 生成的内容仅供参考 · 业务数据来自 jill-ai-mcp · 模型 deepseek-chat</div>
          </div>
        </div>
      </div>
    </div>
  )
}
