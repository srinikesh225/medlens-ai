import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEMO_MODE } from '@/config'

/**
 * Demo authentication.
 *
 * HONESTY: MedLens is a client-side prototype, so this is a DEMO auth gate — it
 * demonstrates the access boundary in the UI and persists a session locally. It
 * is NOT production security: no credentials are checked on a server, and all
 * data is synthetic. In production this component is replaced by a real identity
 * provider (OIDC/SSO) — see the README's production architecture.
 */

export interface AuthUser {
  name: string
  email: string
  role: string
}

/** The single demo account. Shown on the login screen so sign-in always works. */
export const DEMO_CREDENTIALS = {
  email: 'reviewer@medlens.health',
  password: 'medlens',
}

const DEMO_USER: AuthUser = {
  name: 'Dr. A. Rao',
  email: DEMO_CREDENTIALS.email,
  role: 'Clinical reviewer',
}

const STORAGE_KEY = 'medlens.auth.v1'

/** Pure credential check. Exported so the access boundary is unit-testable. */
export function authenticate(email: string, password: string): AuthUser | null {
  const ok =
    email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password
  return ok ? DEMO_USER : null
}

interface AuthValue {
  user: AuthUser | null
  signIn: (user?: AuthUser) => void
  signOut: () => void
  /** Validate demo credentials. Returns the user or null (wrong credentials). */
  authenticate: (email: string, password: string) => AuthUser | null
}

const AuthContext = createContext<AuthValue | null>(null)

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // In DEMO_MODE the app opens straight on the seeded record — a reviewer is
  // already signed in. The sign-in screen still exists and is reachable via
  // "Sign out", so the access boundary is demonstrable without making a judge
  // type credentials before seeing anything.
  const [user, setUser] = useState<AuthUser | null>(() => load() ?? (DEMO_MODE ? DEMO_USER : null))

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [user])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      signIn: (u = DEMO_USER) => setUser(u),
      signOut: () => setUser(null),
      authenticate,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
