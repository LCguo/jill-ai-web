import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../api/assistant.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.listSessions()
      setSessions(Array.isArray(list) ? list : [])
    } catch (e) {
      // 旧 SAA 会话端点（/api/assistant/sessions）已随 jill-ai-agent 迁移 AgentScope 废弃，
      // 后端没有该端点 → 404。这是预期行为，静默降级为空列表，不打断页面。
      if (e?.status === 404) {
        console.debug('[SessionProvider] legacy session API unavailable (404), sessions disabled')
      } else {
        console.error('load sessions failed', e)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async ({ title, mode } = {}) => {
    const s = await api.createSession({ title, mode: mode || 'CHAT' })
    setSessions((prev) => [s, ...prev])
    setCurrentId(s.id)
    return s
  }, [])

  const remove = useCallback(async (id) => {
    await api.deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    setCurrentId((cur) => (cur === id ? null : cur))
  }, [])

  const select = useCallback((id) => setCurrentId(id), [])

  const setMode = useCallback(async (id, mode) => {
    const updated = await api.updateSession(id, { mode })
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }, [])

  const rename = useCallback(async (id, title) => {
    const updated = await api.updateSession(id, { title })
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }, [])

  const value = useMemo(() => ({
    sessions, currentId, loading,
    current: sessions.find((s) => s.id === currentId) || null,
    refresh, create, remove, select, setMode, rename,
  }), [sessions, currentId, loading, refresh, create, remove, select, setMode, rename])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSessionContext must be used within SessionProvider')
  return ctx
}
