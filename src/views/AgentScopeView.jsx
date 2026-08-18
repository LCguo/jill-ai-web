import { useState, useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'
import { useAguiChat } from '../hooks/useAguiChat.js'

const EXAMPLES = [
  '查询 2026-05-01 到 2026-05-10 的每日订单数',
  '5 月份各区域销售额排名',
  '销售额最高的前 3 个产品',
  '查一下华为的机构编号，再查它的 KPI 趋势',
  '现在几点了？',
]

// 工具名 → 中文标签 + 图标
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
}

const TOOL_ICONS = {
  find_metric: '◎', lookup_org: '◈', search_knowledge: '▤', hybrid_search: '✧',
  list_allowed_tables: '▦', get_table_schema: '▧', execute_sql: '⌗',
  read_document_content: '▤', daily_order_count: '▦', sales_by_region: '◉',
  top_products: '♛', kpi_trend: '↗', get_current_time: '◷',
}

function tryPrettyJson(s) {
  try { return JSON.stringify(JSON.parse(s), null, 2) } catch { return s }
}
function truncate(s, n) {
  if (typeof s !== 'string') s = String(s)
  return s.length > n ? s.slice(0, n) + '…' : s
}

/* ---------- 工具调用面板（暗色数据面板） ---------- */
function ToolCallCard({ tool }) {
  const isRunning = tool.state === 'running'
  const icon = TOOL_ICONS[tool.name] || '⌘'
  return (
    <div className={`tool-card tool-${tool.state}`}>
      <div className="tool-card-header">
        <span className="tool-card-name">
          <span className="tool-card-icon">{icon}</span>
          {TOOL_LABELS[tool.name] || tool.name}
        </span>
        <span className={`tool-card-state tool-state-${tool.state}`}>
          {isRunning ? (
            <><span className="spinner" /> RUNNING</>
          ) : (
            <>✓ DONE</>
          )}
        </span>
      </div>
      <div className="tool-card-body">
        {tool.args && (
          <details className="tool-card-details" open={isRunning}>
            <summary>args</summary>
            <pre>{tryPrettyJson(tool.args)}</pre>
          </details>
        )}
        {tool.result && (
          <details className="tool-card-details" open={!isRunning}>
            <summary>result</summary>
            <pre>{truncate(tool.result, 1500)}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

/* ---------- 消息气泡 ---------- */
function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="msg-avatar user-avatar">YOU</div>
        <div className="msg-bubble user-bubble">{msg.content}</div>
      </div>
    )
  }
  const html = useMemo(() => {
    try {
      return marked.parse(msg.content || '', { breaks: true, gfm: true })
    } catch {
      return msg.content || ''
    }
  }, [msg.content])
  return (
    <div className="msg msg-assistant">
      <div className="msg-avatar assistant-avatar">J</div>
      <div className="msg-bubble assistant-bubble">
        {(msg.toolCalls || []).map(t => <ToolCallCard key={t.id} tool={t} />)}
        {msg.content ? (
          <div className="markdown-body msg-markdown" dangerouslySetInnerHTML={{ __html: html }} />
        ) : msg.isStreaming ? <span className="cursor-block" /> : null}
        {msg.isStreaming && msg.content && <span className="cursor-block" />}
        {msg.error && <div className="msg-error">⚠ {msg.error}</div>}
      </div>
    </div>
  )
}

/* ---------- 终端输入区 ---------- */
function TerminalInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  function submit() {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className={`term-input ${disabled ? 'term-disabled' : ''}`}>
      <span className="term-prompt">❯</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="输入业务问题，如：查询最近一周的转化率趋势 …"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        disabled={disabled}
      />
      {disabled ? (
        <button className="term-btn term-stop" onClick={() => {}}>■</button>
      ) : (
        <button className="term-btn term-send" onClick={submit} disabled={!value.trim()}>
          ⏎
        </button>
      )}
    </div>
  )
}

/* ---------- AG-UI 协议监视器（终端日志面板） ---------- */
function fmtTs(ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}
function ProtocolMonitor({ events, open, onClose }) {
  const logRef = useRef(null)
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [events])
  // 事件类型 → 显示色
  const colorFor = (t) => {
    if (t.startsWith('RUN_')) return 'var(--as-accent)'
    if (t.startsWith('TOOL_CALL')) return 'var(--as-accent2)'
    if (t.startsWith('TEXT_MESSAGE')) return 'var(--as-green)'
    return 'var(--as-text-dim)'
  }
  // 精简 payload
  const brief = (evt) => {
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
        <span className="protocol-title">
          <span className="protocol-led" /> AG-UI EVENT STREAM
        </span>
        <button className="protocol-close" onClick={onClose} title="关闭">✕</button>
      </div>
      <div className="protocol-body" ref={logRef}>
        {events.length === 0 ? (
          <div className="protocol-empty">// 尚无协议事件，发送消息后此处实时滚动 AG-UI 事件</div>
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

  // 自动滚动到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => clear(), [clear])

  return (
    <div className="agentscope-page">
      {/* 顶部终端状态条 */}
      <div className="as-topbar">
        <div className="as-brand">
          <span className="as-logo">◈</span>
          <span className="as-brand-name">JILL·AI 指标终端</span>
          <span className="as-brand-sub">AgentScope · DeepSeek · MCP</span>
        </div>
        <div className="as-status">
          <span className={`as-status-dot ${isStreaming ? 'busy' : ''}`} />
          <span className="as-status-text">{isStreaming ? 'AGENT RUNNING' : 'AGENT IDLE'}</span>
          <span className="as-divider">|</span>
          <span className="as-status-model">model: deepseek-chat</span>
          <span className="as-divider">|</span>
          <span className="as-status-thread">
            thread: <code>{threadId || '—'}</code>
          </span>
          <button
            className={`as-protocol-btn ${showProtocol ? 'active' : ''}`}
            onClick={toggleProtocol}
            title="AG-UI 协议事件监视器"
          >
            {showProtocol ? '▣' : '▢'} AG-UI <span className="as-protocol-count">{protocolEvents.length}</span>
          </button>
        </div>
      </div>

      {/* 主工作区 */}
      <div className="as-shell">
        <ProtocolMonitor events={protocolEvents} open={showProtocol} onClose={toggleProtocol} />
        <header className="as-head">
          <div className="as-head-title">
            <span className="as-head-caret">❯</span>
            业务指标查询会话
          </div>
          <button className="as-clear" onClick={clear} disabled={isStreaming}>
            ⌫ 清空
          </button>
        </header>

        <div className="as-messages" ref={listRef}>
          {messages.length === 0 ? (
            <div className="as-empty">
              <div className="as-empty-glyph">◈</div>
              <p className="as-empty-title">指标查询终端就绪</p>
              <p className="as-empty-sub">
                AgentScope 将自动匹配 MCP 工具完成查询<br />
                <span className="as-empty-hint">试试下面的示例，或直接输入自然语言</span>
              </p>
              <div className="as-examples">
                {EXAMPLES.map((e, i) => (
                  <button
                    key={i}
                    className="as-example-chip"
                    onClick={() => send(e)}
                    disabled={isStreaming}
                  >
                    <span className="as-example-num">{String(i + 1).padStart(2, '0')}</span>
                    {e}
                  </button>
                ))}
              </div>
              {error && <div className="as-empty-error">⚠ {error}</div>}
            </div>
          ) : (
            messages.map(m => <MessageBubble key={m.id} msg={m} />)
          )}
        </div>

        <div className="as-input-zone">
          <TerminalInput onSend={send} disabled={isStreaming} />
          <div className="as-input-meta">
            <span>{isStreaming ? '● 正在执行…' : '◦ 就绪'}</span>
            <span className="as-input-meta-right">Enter 发送 · 支持自然语言查询</span>
          </div>
        </div>
      </div>
    </div>
  )
}
