import { useState } from 'react'
import DocumentUploader from '../components/DocumentUploader.jsx'
import DocumentList from '../components/DocumentList.jsx'
import DocumentPreview from '../components/DocumentPreview.jsx'
import { useDocuments } from '../hooks/useDocuments.js'

export default function DocumentsView() {
  const { docs, loading, statusFilter, setStatusFilter, keyword, setKeyword, upload, remove } = useDocuments()
  const [preview, setPreview] = useState(null)

  return (
    <div className="documents-page">
      <div className="documents-head">
        <h2>文档管理</h2>
      </div>
      <DocumentUploader onUpload={(file, domain) => upload(file, domain)} />
      <DocumentList
        docs={docs}
        loading={loading}
        statusFilter={statusFilter}
        onFilter={setStatusFilter}
        keyword={keyword}
        onKeyword={setKeyword}
        onPreview={setPreview}
        onDelete={remove}
      />
      {preview && <DocumentPreview doc={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
