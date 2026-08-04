import { describe, expect, it } from 'vitest'
import { createSseParser } from './sseParser.js'

function collect(chunks) {
  const events = []
  const parser = createSseParser((e) => events.push(e))
  for (const chunk of chunks) parser.push(chunk)
  parser.end()
  return events
}

describe('createSseParser', () => {
  it('解析命名事件与 JSON data（Spring 无空格 data: 格式）', () => {
    const events = collect([
      'event:delta\ndata:{"text":"你好"}\n\n',
    ])
    expect(events).toEqual([{ event: 'delta', data: { text: '你好' } }])
  })

  it('容忍 data: 后带空格', () => {
    const events = collect(['event:delta\ndata: {"text":"x"}\n\n'])
    expect(events[0].data).toEqual({ text: 'x' })
  })

  it('跨 chunk 缓冲不完整行', () => {
    const events = collect([
      'event:delta\ndata:{"text":"你',
      '好"}\n\n',
    ])
    expect(events).toEqual([{ event: 'delta', data: { text: '你好' } }])
  })

  it('多行 data 用 \n 拼接', () => {
    const events = collect(['event:msg\ndata:{"a":1}\ndata:{"b":2}\n\n'])
    expect(events[0].data).toEqual({ a: 1, b: 2 })
  })

  it('忽略以 : 开头的注释行', () => {
    const events = collect([': ping\n\n', 'event:finished\ndata:{}\n\n'])
    expect(events.map((e) => e.event)).toEqual(['finished'])
  })

  it('每个事件后重置 event 名（默认 message）', () => {
    const events = collect([
      'event:delta\ndata:{"text":"a"}\n\n',
      'data:{"text":"b"}\n\n',
    ])
    expect(events.map((e) => e.event)).toEqual(['delta', 'message'])
  })

  it('非法 JSON 不抛错，挂到 raw 字段', () => {
    const events = collect(['event:error\ndata:not json\n\n'])
    expect(events[0].data).toEqual({ raw: 'not json' })
  })

  it('处理 CRLF 行尾', () => {
    const events = collect(['event:delta\r\ndata:{"text":"x"}\r\n\r\n'])
    expect(events[0]).toEqual({ event: 'delta', data: { text: 'x' } })
  })
})
