import { createBrowserRouter, Link } from 'react-router-dom'
import HomeView from './views/HomeView.jsx'
import AssistantView from './views/AssistantView.jsx'
import QaView from './views/QaView.jsx'
import DocumentsView from './views/DocumentsView.jsx'

const router = createBrowserRouter([
  { path: '/', element: <HomeView /> },
  { path: '/assistant', element: <AssistantView /> },
  { path: '/qa', element: <QaView /> },
  { path: '/documents', element: <DocumentsView /> },
])

export default router
export { Link }
