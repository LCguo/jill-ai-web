const MODES = [
  { value: 'CHAT', label: '闲聊' },
  { value: 'KB_SEARCH', label: '知识库' },
]

export default function ModeSwitcher({ value, onChange, disabled }) {
  return (
    <div className="mode-switcher" role="group" aria-label="对话模式">
      {MODES.map((m) => (
        <button
          key={m.value}
          className={'mode-btn' + (value === m.value ? ' active' : '')}
          onClick={() => onChange?.(m.value)}
          disabled={disabled}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
