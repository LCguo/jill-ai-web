import { request } from './client.js'

export const listDocuments = (status) =>
  request('/documents' + (status ? `?status=${encodeURIComponent(status)}` : ''))

export const getDocument = (id) => request(`/documents/${id}`)

export const previewDocumentUrl = (id) => `/api/documents/${id}/preview`

export const uploadDocument = (file, docDomain, parse = true) => {
  const fd = new FormData()
  fd.append('file', file)
  if (docDomain) fd.append('docDomain', docDomain)
  if (!parse) fd.append('parse', 'false')
  return request('/documents/upload', { method: 'POST', body: fd })
}

export const deleteDocument = (id) => request(`/documents/${id}`, { method: 'DELETE' })
