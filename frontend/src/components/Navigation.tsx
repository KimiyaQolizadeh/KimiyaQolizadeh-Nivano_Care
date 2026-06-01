import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import InlineStatus from './InlineStatus'
import Button from './Button'
import BrandMark from './BrandMark'
import { getRoleDashboardPath } from '../utils/routes'

export default function Navigation() {
  const { user, logout } = useAuth()

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : 'NC'
  const dashboardPath = getRoleDashboardPath(user?.role)

  return (
    <nav className="sticky top-0 z-50 border-b border-blue-100/70 bg-white/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3 hover:opacity-95 transition">
          <BrandMark />
        </Link>

        <div className="hidden md:flex items-center gap-8 ml-auto">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-medium transition ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`
            }
          >
            Home
          </NavLink>
          {user && (
            <NavLink
              to={dashboardPath}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`
              }
            >
              Dashboard
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right text-sm">
                <span className="font-semibold text-slate-900">{user.email}</span>
                <span className="text-xs text-slate-500 uppercase tracking-[0.22em]">{user.role} portal</span>
              </div>
              <InlineStatus status={user.status} />
              <div className="w-px h-6 bg-slate-100" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center text-slate-700 font-semibold shadow-sm">
                  {initials}
                </div>
                <Button onClick={logout} variant="ghost" size="sm">
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                to="/login"
                className="rounded-2xl bg-transparent hover:bg-slate-100 text-slate-900 px-4 py-2.5 text-sm font-semibold transition"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 text-white px-4 py-2.5 text-sm font-semibold shadow-md transition hover:opacity-95"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
