const TOOL_LABELS = { kb_search: '知识库检索', nl2sql: '数据查询' }

export default function ToolCallIndicator({ name, state, summary }) {
  const label = TOOL_LABELS[name] || name
  return (
    <div className="tool-indicator">
      {state === 'running' ? (
        <span className="tool-running">
          <span className="tool-spinner" /> 正在调用 {label}…
        </span>
      ) : (
        <span className="tool-done">
          ✓ {label} 已返回{summary ? `：${summary}` : ''}
        </span>
      )}
    </div>
  )
}
