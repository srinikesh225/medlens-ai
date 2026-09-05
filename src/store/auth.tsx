import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

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
  const [user, setUser] = useState<AuthUser | null>(load)

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
      authenticate: (email, password) => {
        const ok =
          email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        return ok ? DEMO_USER : null
      },
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
