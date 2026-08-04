import { marked } from 'marked'

export default function MarkdownText({ text }) {
  if (!text) return null
  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: marked.parse(text) }}
    />
  )
}
