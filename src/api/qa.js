import { request } from './client.js'

export const ask = ({ question, domain }) =>
  request('/qa/ask', { method: 'POST', body: { question, domain } })
