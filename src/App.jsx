import { Component } from 'react'
import { RouterProvider } from 'react-router-dom'
import router from './router.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 40, fontFamily: 'monospace', color: '#e74c3c', background: '#fff',
          maxWidth: 800, margin: '40px auto', borderRadius: 8, border: '2px solid #e74c3c',
        }}>
          <h2>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#999', marginTop: 12 }}>
            {this.state.error.stack?.slice(0, 600)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  // 注意：全局不再包 SessionProvider —— 它依赖已废弃的 /api/assistant/sessions 端点（SAA 时代），
  // 会在每个页面挂载时触发 404。旧 /assistant 页面自身已做 404 降级。
  return <AppErrorBoundary><RouterProvider router={router} /></AppErrorBoundary>
}
