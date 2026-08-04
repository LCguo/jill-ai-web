import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/documents.js'

const TERMINAL = new Set(['READY', 'FAILED'])
const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 10 * 60 * 1000

export function useDocuments() {
  const [docs, setDocs] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const timersRef = useRef(new Map())

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await api.listDocuments(statusFilter || undefined)
      setDocs(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('load documents failed', e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { refresh() }, [refresh])

  const stopPolling = useCallback((id) => {
    const t = timersRef.current.get(id)
    if (t) { clearTimeout(t); timersRef.current.delete(id) }
  }, [])

  const pollUntilTerminal = useCallback((id) => {
    const started = Date.now()
    const tick = async () => {
      try {
        const doc = await api.getDocument(id)
        setDocs((prev) => prev.map((d) => (d.id === id ? doc : d)))
        if (TERMINAL.has(doc.status) || Date.now() - started > POLL_TIMEOUT) {
          stopPolling(id)
          return
        }
      } catch (e) {
        console.error('poll document failed', e)
      }
      timersRef.current.set(id, setTimeout(tick, POLL_INTERVAL))
    }
    timersRef.current.set(id, setTimeout(tick, POLL_INTERVAL))
  }, [stopPolling])

  const upload = useCallback(async (file, docDomain) => {
    const created = await api.uploadDocument(file, docDomain)
    setDocs((prev) => [{ ...created, originalName: file.name, fileSize: file.size }, ...prev])
    pollUntilTerminal(created.id)
    return created
  }, [pollUntilTerminal])

  const remove = useCallback(async (id) => {
    await api.deleteDocument(id)
    stopPolling(id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }, [stopPolling])

  useEffect(() => () => timersRef.current.forEach((t) => clearTimeout(t)), [])

  const filtered = keyword.trim()
    ? docs.filter((d) => (d.originalName || '').toLowerCase().includes(keyword.trim().toLowerCase()))
    : docs

  return {
    docs: filtered, loading, statusFilter, setStatusFilter, keyword, setKeyword,
    upload, remove, refresh,
  }
}
