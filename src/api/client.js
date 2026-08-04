const BASE = '/api'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const opts = { method, headers: { ...headers }, signal }
  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body
    } else {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }

  const resp = await fetch(BASE + path, opts)
  const text = await resp.text()

  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!resp.ok) {
    const message = (data && typeof data === 'object' && data.message) || `请求失败 (${resp.status})`
    throw new ApiError(message, resp.status, data)
  }
  return data
}
