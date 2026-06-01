import type { UserRole } from '../types'

export function getRoleDashboardPath(role?: UserRole | null) {
  if (role === 'admin') return '/admin'
  if (role === 'facility') return '/facility'
  if (role === 'nurse') return '/nurse'
  return '/login'
}
