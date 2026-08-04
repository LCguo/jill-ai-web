import { request } from './client.js'
import { streamSse } from '../lib/streamSse.js'

export const listSessions = () => request('/assistant/sessions')

export const createSession = ({ title, mode } = {}) =>
  request('/assistant/sessions', { method: 'POST', body: { title, mode } })

export const updateSession = (id, patch) =>
  request(`/assistant/sessions/${id}`, { method: 'PATCH', body: patch })

export const deleteSession = (id) =>
  request(`/assistant/sessions/${id}`, { method: 'DELETE' })

export const getSessionContext = (id) =>
  request(`/assistant/sessions/${id}/context`)

export function streamChat({ sessionId, message, signal, onEvent }) {
  return streamSse('/api/assistant/chat/stream', { sessionId, message }, { signal, onEvent })
}
