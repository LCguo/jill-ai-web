const STYLES = {
  SUFFICIENT: { bg: '#f6ffed', border: '#52c41a', color: '#389e0d' },
  PARTIAL: { bg: '#e6f4ff', border: '#1677ff', color: '#0958d9' },
  WEAK: { bg: '#fffbe6', border: '#faad14', color: '#ad6800' },
  NONE: { bg: '#fff2f0', border: '#ff4d4f', color: '#cf1322' },
}

const LABELS = {
  SUFFICIENT: '证据充分',
  PARTIAL: '部分证据',
  WEAK: '证据较弱',
  NONE: '无证据',
}

export default function EvidenceBadge({ level }) {
  if (!level) return null
  const s = STYLES[level] || STYLES.NONE
  return (
    <span className="evidence-badge" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
      {LABELS[level] || level}
    </span>
  )
}
