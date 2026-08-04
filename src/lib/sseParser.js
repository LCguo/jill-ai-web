export function createSseParser(onEvent) {
  let buffer = ''
  let eventName = 'message'
  const dataLines = []

  function flush() {
    if (dataLines.length === 0) {
      eventName = 'message'
      return
    }
    const raw = dataLines.join('\n')
    dataLines.length = 0
    const name = eventName
    eventName = 'message'

    let payload
    try {
      // 多行 data 若每段都是独立 JSON 对象，合并成一个对象
      const objs = raw.split('\n').map((s) => JSON.parse(s))
      payload = objs.length === 1 ? objs[0] : Object.assign({}, ...objs)
    } catch {
      try {
        payload = JSON.parse(raw)
      } catch {
        payload = { raw }
      }
    }
    onEvent({ event: name, data: payload })
  }

  return {
    push(chunk) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const rawLine of lines) {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
        if (line === '') {
          flush()
          continue
        }
        if (line.startsWith(':')) continue
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let value = colon === -1 ? '' : line.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'event') eventName = value
        else if (field === 'data') dataLines.push(value)
      }
    },
    end() {
      if (buffer.length > 0) {
        const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer
        if (line !== '') {
          const colon = line.indexOf(':')
          const field = colon === -1 ? line : line.slice(0, colon)
          let value = colon === -1 ? '' : line.slice(colon + 1)
          if (value.startsWith(' ')) value = value.slice(1)
          if (field === 'event') eventName = value
          else if (field === 'data') dataLines.push(value)
        }
        buffer = ''
      }
      flush()
    },
  }
}
