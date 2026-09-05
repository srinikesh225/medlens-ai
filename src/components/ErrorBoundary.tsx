import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Global error boundary.
 *
 * Guarantees the checklist rule "no stack trace reachable from any UI error
 * path": an unexpected render error produces a calm, human-readable fallback —
 * never a stack trace, never a blank screen. Details are deliberately NOT shown
 * (they could contain record contents) and nothing is logged to the console,
 * which would put patient data in client-side logs.
 */
interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Intentionally not logged: error details may contain record content.
    // A production build would forward a redacted event to server-side telemetry.
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen grid place-items-center bg-canvas p-6">
        <div className="card p-8 max-w-md text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
          <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
          <p className="text-sm text-ink-500 mt-2">
            MedLens hit an unexpected problem while rendering this view. Your record is stored
            locally and has not been changed.
          </p>
          <button className="btn-primary mt-5" onClick={() => window.location.reload()}>
            <RotateCcw size={15} /> Reload MedLens
          </button>
        </div>
      </div>
    )
  }
}
