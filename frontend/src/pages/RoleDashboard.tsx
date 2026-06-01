import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRoleDashboardPath } from '../utils/routes'

export default function RoleDashboard() {
  const { user } = useAuth()

  return <Navigate to={getRoleDashboardPath(user?.role)} replace />
}
