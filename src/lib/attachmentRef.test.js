import { describe, it, expect } from 'vitest'
import { buildAttachmentRef, buildFullMessage } from './attachmentRef.js'

describe('buildAttachmentRef', () => {
  it('formats attachment reference', () => {
    expect(buildAttachmentRef({ id: 'abc-123', name: 'a.pdf' }))
      .toBe('【附件：a.pdf 文件ID=abc-123】')
  })
})

describe('buildFullMessage', () => {
  it('appends attachment reference to trimmed input', () => {
    expect(buildFullMessage(' 帮我总结 ', { id: 'abc', name: 'a.pdf' }))
      .toBe('帮我总结 【附件：a.pdf 文件ID=abc】')
  })

  it('returns trimmed input without attachment', () => {
    expect(buildFullMessage(' 你好 ', null)).toBe('你好')
  })

  it('returns empty string for blank input and no attachment', () => {
    expect(buildFullMessage('  ', null)).toBe('')
  })
})
