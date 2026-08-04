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
    return <RouterProvider router={router} />
  }
}

export default function App() {
  return <AppErrorBoundary><RouterProvider router={router} /></AppErrorBoundary>
}
