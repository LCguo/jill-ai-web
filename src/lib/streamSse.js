import { createSseParser } from './sseParser.js'

export async function streamSse(url, body, { signal, onEvent }) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!resp.ok) {
    throw new Error(`流式请求失败 (${resp.status})`)
  }
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser(onEvent)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
    }
    parser.push(decoder.decode())
    parser.end()
  } finally {
    reader.releaseLock()
  }
}
