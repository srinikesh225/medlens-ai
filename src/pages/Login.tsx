import { useState, type FormEvent } from 'react'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth, DEMO_CREDENTIALS } from '@/store/auth'
import { usePageMeta } from '@/seo/usePageMeta'
import { SITE_URL } from '@/seo/siteConfig'
import { SAFETY_DISCLAIMER } from '@/domain/safety'

const TRUST = [
  'Reference-range status read only from the source report',
  'Every value linked to its exact place in the document',
  'Conflicts surfaced for a human — never auto-resolved',
  'Summaries linted against diagnostic language',
]

export default function Login() {
  const { signIn, authenticate } = useAuth()
  usePageMeta({
    path: '/login',
    title: 'Sign in — MedLens',
    description: 'Sign in to MedLens, the clinical information intelligence workspace.',
    breadcrumbs: [{ name: 'Sign in', path: '/login' }],
  })

  const [email, setEmail] = useState(DEMO_CREDENTIALS.email)
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    // Credentials are checked locally and synchronously. No network call is
    // made, so no delay is simulated.
    const user = authenticate(email, password)
    if (user) {
      signIn(user)
    } else {
      setError('Those credentials don’t match the demo account shown below.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-canvas">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-2xl bg-primary-900/50 ring-1 ring-white/15">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
              <path d="M9 21V11l7 5 7-5v10" fill="none" stroke="#75c4c8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="16" r="2.6" fill="#aadddf" />
            </svg>
          </span>
          <div>
            <div className="font-semibold text-lg leading-tight">MedLens</div>
            <div className="text-primary-200 text-xs">Clinical Information Intelligence</div>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-3xl xl:text-[38px] font-bold leading-tight tracking-tight">
            Clinical information<br />you can trace and trust.
          </h2>
          <p className="mt-3 text-primary-100/90 max-w-md">
            Fragmented reports become a structured, source-linked, human-reviewable record —
            organized, never diagnosed.
          </p>
          <ul className="mt-6 space-y-2.5 max-w-md">
            {TRUST.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[15px] text-primary-50">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent-300" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] leading-snug text-primary-200/80 max-w-md">{SAFETY_DISCLAIMER}</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary-800">
              <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
                <path d="M9 21V11l7 5 7-5v10" fill="none" stroke="#75c4c8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="16" cy="16" r="2.6" fill="#aadddf" />
              </svg>
            </span>
            <div>
              <div className="font-semibold text-ink-900">MedLens</div>
              <div className="text-[11px] text-ink-400 -mt-0.5">Clinical Information Intelligence</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h1>
          <p className="text-sm text-ink-500 mt-1.5">Access the clinical review workspace.</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="mt-1.5 relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 pl-9 pr-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary-500"
                  placeholder="you@clinic.example"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="mt-1.5 relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-ink-200 pl-9 pr-10 py-2.5 text-sm focus-visible:ring-2 focus-visible:ring-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-400 hover:text-ink-700"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[13px] text-rose-800" role="alert">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-ink-400">
            <span className="h-px flex-1 bg-ink-200" /> or <span className="h-px flex-1 bg-ink-200" />
          </div>

          <button className="btn-secondary w-full py-2.5" onClick={() => signIn()}>
            Continue as demo reviewer
          </button>

          <div className="mt-5 rounded-xl bg-canvas border border-ink-200/70 px-3.5 py-3 text-[12px] text-ink-500">
            <div className="font-medium text-ink-600">Demo account</div>
            <div className="mt-0.5 font-mono text-ink-700">{DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}</div>
            <p className="mt-2 leading-snug">
              Prototype authentication for demonstration only — credentials are checked locally, not on
              a server, and all patient data is synthetic. Production replaces this with a real identity
              provider (SSO/OIDC).
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-400">
            {new URL(SITE_URL).host} · MedLens organizes medical information; it does not provide a diagnosis.
          </p>
        </div>
      </div>
    </div>
  )
}
