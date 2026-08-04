import { useSessions } from '../hooks/useSessions.js'

const MODE_LABEL = { CHAT: '闲聊', KB_SEARCH: '知识库' }

export default function SessionSidebar() {
  const { sessions, currentId, loading, create, select, remove } = useSessions()

  return (
    <aside className="session-sidebar">
      <button className="new-session-btn" onClick={() => create({ mode: 'CHAT' })}>
        + 新建会话
      </button>
      <div className="session-list">
        {loading && <div className="session-empty">加载中…</div>}
        {!loading && sessions.length === 0 && (
          <div className="session-empty">暂无会话</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={'session-item' + (s.id === currentId ? ' active' : '')}
            onClick={() => select(s.id)}
          >
            <div className="session-item-title">{s.title || '新会话'}</div>
            <div className="session-item-meta">
              <span>{MODE_LABEL[s.mode] || s.mode}</span>
              <button
                className="session-delete"
                onClick={(e) => { e.stopPropagation(); remove(s.id) }}
                title="删除会话"
              >×</button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
