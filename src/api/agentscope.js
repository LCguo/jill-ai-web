import { request } from './client.js'
import { streamSse } from '../lib/streamSse.js'

// 与 jill-ai-agent 的 AgentScopeStreamController 配套
// 后端: POST /api/agentscope/chat/stream   (SSE)
// 事件: delta / tool_call / tool_result / finished / error

export function newAgentScopeSession() {
  return request('/agentscope/sessions', { method: 'POST' })
}

export function endAgentScopeSession(id) {
  return request(`/agentscope/sessions/${id}`, { method: 'DELETE' })
}

export function streamAgentScopeChat({ sessionId, message, signal, onEvent }) {
  return streamSse('/api/agentscope/chat/stream', { sessionId, message }, { signal, onEvent })
}
