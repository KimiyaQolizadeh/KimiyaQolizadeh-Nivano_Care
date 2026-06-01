import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Navigation from './Navigation'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#E0F2FE_0,transparent_32%),linear-gradient(135deg,#F8FAFC_0%,#FFFFFF_48%,#ECFDF5_100%)]">
      {!isLandingPage && <Navigation />}
      <main className={isLandingPage ? '' : 'px-4 py-10 lg:py-12'}>
        {isLandingPage ? children : <div className="max-w-7xl mx-auto">{children}</div>}
      </main>
    </div>
  )
}
