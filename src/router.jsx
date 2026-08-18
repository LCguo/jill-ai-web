import { createBrowserRouter, Link } from 'react-router-dom'
import HomeView from './views/HomeView.jsx'
import AssistantView from './views/AssistantView.jsx'
import QaView from './views/QaView.jsx'
import DocumentsView from './views/DocumentsView.jsx'
import AgentScopeView from './views/AgentScopeView.jsx'

const router = createBrowserRouter([
  { path: '/', element: <HomeView /> },
  { path: '/assistant', element: <AssistantView /> },
  { path: '/qa', element: <QaView /> },
  { path: '/documents', element: <DocumentsView /> },
  { path: '/agentscope', element: <AgentScopeView /> },
])

export default router
export { Link }
