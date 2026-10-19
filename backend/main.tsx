import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

type BoundaryState = { error: Error | null }

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Bclick Admin failed to render:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f8fafc', fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
          <section style={{ width: '100%', maxWidth: 640, border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 24, boxShadow: '0 8px 30px rgba(15, 23, 42, .06)' }}>
            <div style={{ display: 'inline-flex', borderRadius: 8, background: '#fee2e2', color: '#b91c1c', padding: '5px 9px', fontSize: 12, fontWeight: 700 }}>Dashboard render error</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 8px' }}>The admin dashboard could not render.</h1>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>The application loaded, but a component threw an error. The details below can help identify the failing component.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 16, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', padding: 12, fontSize: 12, color: '#9f1239' }}>{this.state.error.message}</pre>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, borderRadius: 8, background: '#0f172a', color: '#fff', padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>Reload dashboard</button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Cannot start Bclick Admin: #root element was not found in index.html.')
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
