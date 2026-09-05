import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store/store'
import { AuthProvider } from './store/auth'

/**
 * Render-level smoke test: mounts the full app (with lazy-loaded routes) for
 * every route and waits for the route's own content to appear past Suspense.
 * Catches runtime errors that a type-check and a bundle build cannot.
 */
function renderAt(path: string) {
  return render(
    <AuthProvider>
      <StoreProvider>
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </MemoryRouter>
      </StoreProvider>
    </AuthProvider>,
  )
}

function signIn() {
  localStorage.setItem(
    'medlens.auth.v1',
    JSON.stringify({ name: 'Dr. A. Rao', email: 'reviewer@medlens.health', role: 'Clinical reviewer' }),
  )
}

beforeEach(() => {
  try {
    localStorage.clear()
    signIn() // route tests run as an authenticated reviewer
  } catch {
    /* ignore */
  }
})
afterEach(cleanup)

describe('app renders every route', () => {
  const cases: [string, string][] = [
    ['/', 'Patient overview'],
    ['/patient', 'Patient profile'],
    ['/reports', 'Reports'],
    ['/review', 'Human review'],
    ['/timeline', 'Timeline & trends'],
    ['/summary', 'AI summary'],
    ['/reports/rep_cbc_jul', 'CBC — 15 Jul 2026'],
    ['/does-not-exist', 'This page could not be found'],
  ]

  for (const [path, heading] of cases) {
    it(`renders ${path}`, async () => {
      renderAt(path)
      expect(await screen.findByRole('heading', { name: heading })).toBeTruthy()
      // The patient header is always present once the store hydrates.
      expect(screen.getAllByText(/Jordan M\. Rivera/i).length).toBeGreaterThan(0)
    })
  }

  it('sets a unique document title per route', async () => {
    renderAt('/summary')
    await screen.findByRole('heading', { name: 'AI summary' })
    expect(document.title).toBe('AI Summary — MedLens')
    expect(document.title).not.toMatch(/vite|react/i)
  })

  it('emits a canonical link and description meta', async () => {
    renderAt('/patient')
    await screen.findByRole('heading', { name: 'Patient profile' })
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/patient')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy()
  })

  it('shows the safety disclaimer on the summary page', async () => {
    renderAt('/summary')
    expect(await screen.findByText(/does not provide a medical diagnosis/i)).toBeTruthy()
  })

  it('shows the honest missing-range message in a report with no source range', async () => {
    renderAt('/reports/rep_cbc_jul')
    expect(await screen.findAllByText('Reference range not provided in source.')).toBeTruthy()
  })
})

describe('authentication gate', () => {
  it('shows the sign-in screen when no session exists', async () => {
    localStorage.removeItem('medlens.auth.v1')
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
    // The gated app content must NOT be present.
    expect(screen.queryByText('Patient overview')).toBeNull()
  })

  it('signing in with the prefilled demo account reveals the app', async () => {
    localStorage.removeItem('medlens.auth.v1')
    renderAt('/')
    await screen.findByRole('heading', { name: 'Sign in' })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    // Sign-in simulates a short round-trip, then the app shell appears.
    expect(await screen.findByRole('heading', { name: 'Patient overview' }, { timeout: 2000 })).toBeTruthy()
  })
})
