export const buildAttachmentRef = ({ id, name }) => `【附件：${name} 文件ID=${id}】`

export const buildFullMessage = (input, attachment) => {
  const text = (input || '').trim()
  if (!attachment) return text
  return `${text} ${buildAttachmentRef(attachment)}`.trim()
}
