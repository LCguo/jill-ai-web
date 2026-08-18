// jill-ai-mcp 暴露的 12 个 MCP 工具 + 通用兜底
const TOOL_LABELS = {
  // === jill-ai-mcp: 动态指标工具 ===
  daily_order_count: '每日订单数',
  sales_by_region: '区域销售额',
  top_products: '热销产品',
  kpi_trend: 'KPI 趋势',
  // === jill-ai-mcp: 硬编码工具 ===
  find_metric: '指标语义检索',
  lookup_org: '机构编号查询',
  search_knowledge: '知识库检索',
  hybrid_search: '混合检索',
  list_allowed_tables: '列出数据表',
  get_table_schema: '表结构查询',
  execute_sql: '执行 SQL',
  read_document_content: '读取文档',
  // === 已有 / 通用 ===
  kb_search: '知识库检索',
  nl2sql: '数据查询',
  getCurrentTime: '当前时间',
}

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
