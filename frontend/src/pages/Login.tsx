import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Alert from '../components/Alert'
import Input from '../components/Input'
import BrandMark from '../components/BrandMark'
import PremiumCard from '../components/PremiumCard'
import { getRoleDashboardPath } from '../utils/routes'

const roleAccess = [
  { role: 'Admin access', detail: 'Operations role', email: 'admin@test.com', password: 'Admin123!' },
  { role: 'Organization access', detail: 'Healthcare organization role', email: 'facility@test.com', password: 'Facility123!' },
  { role: 'Nurse access', detail: 'Nurse role', email: 'nurse@test.com', password: 'Nurse123!' },
]

function PortalIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    shield: <><path d="M12 3l7 3v5c0 4.6-3 7.9-7 10-4-2.1-7-5.4-7-10V6l7-3z" /><path d="M9 12l2 2 4-5" /></>,
    building: <><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-6h6v6" /></>,
    nurse: <><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" /><path d="M4 21a8 8 0 0116 0" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const state = location.state as { email?: string; password?: string } | null
    if (state?.email) setEmail(state.email)
    if (state?.password) setPassword(state.password)
  }, [location.state])

  if (user) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />
  }

  const fillRoleAccess = (accessEmail: string, accessPassword: string) => {
    setEmail(accessEmail)
    setPassword(accessPassword)
    setSubmitError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setSubmitError(null)

    try {
      const authResponse = await login({ email, password })
      navigate(getRoleDashboardPath(authResponse.role))
    } catch (err: unknown) {
      setSubmitError('Unable to sign in. Check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-blue-100/70 bg-white/80 p-8 shadow-sm shadow-slate-200/70 backdrop-blur">
          <BrandMark />
          <div className="mt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              <PortalIcon name="shield" />
              Secure portal
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950">Sign in to Nivano Care</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Secure access for staffing, credential review, and shift coordination.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">Role access</p>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Access enabled</span>
            </div>
            {roleAccess.map((cred, index) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => fillRoleAccess(cred.email, cred.password)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <PortalIcon name={index === 0 ? 'shield' : index === 1 ? 'building' : 'nurse'} />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{cred.role}</div>
                      <div className="text-xs text-slate-500">{cred.detail}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-blue-700">Fill {cred.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <PremiumCard title="Sign in" subtitle="Select a role account or enter your credentials." accent="bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500">
          <div className="mb-4">
            {(submitError || error) && (
              <Alert type="error" message={submitError || error || 'An error occurred'} />
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              label="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Need access? <Link to="/register" className="font-semibold text-blue-700">Create account</Link>
          </div>
        </PremiumCard>
      </div>
    </div>
  )
}
