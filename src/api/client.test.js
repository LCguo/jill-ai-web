import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client.js'

describe('request', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('GET 默认 JSON 解析返回对象', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"id":"s1"}'),
    })
    const data = await request('/assistant/sessions')
    expect(data).toEqual({ id: 's1' })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/assistant/sessions',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('POST 自动序列化 JSON body 并设置 Content-Type', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve('{}'),
    })
    await request('/assistant/chat', { method: 'POST', body: { message: 'hi' } })
    const [, opts] = global.fetch.mock.calls[0]
    expect(opts.headers['Content-Type']).toBe('application/json')
    expect(opts.body).toBe('{"message":"hi"}')
  })

  it('FormData 不手动设 Content-Type（由浏览器带 boundary）', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 202, text: () => Promise.resolve('{"id":"d1"}'),
    })
    const fd = new FormData()
    fd.append('file', new Blob(['x']), 'a.txt')
    await request('/documents/upload', { method: 'POST', body: fd })
    const [, opts] = global.fetch.mock.calls[0]
    expect(opts.body).toBe(fd)
    expect(opts.headers['Content-Type']).toBeUndefined()
  })

  it('非 2xx 抛 ApiError 且不泄漏整段 body', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 500, text: () => Promise.resolve('internal stack trace...'),
    })
    await expect(request('/x')).rejects.toBeInstanceOf(ApiError)
    await expect(request('/x')).rejects.toMatchObject({ status: 500 })
  })

  it('透传 AbortSignal', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, text: () => Promise.resolve(''),
    })
    const ctrl = new AbortController()
    await request('/x', { signal: ctrl.signal })
    expect(global.fetch.mock.calls[0][1].signal).toBe(ctrl.signal)
  })
})
