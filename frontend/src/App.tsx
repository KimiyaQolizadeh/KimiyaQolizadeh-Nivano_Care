import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RoleDashboard from './pages/RoleDashboard'
import NurseDashboard from './pages/NurseDashboard'
import FacilityDashboard from './pages/FacilityDashboard'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'
import AppShell from './components/AppShell'
import ProtectedRoute from './routes/ProtectedRoute'

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppShell>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/role-dashboard"
            element={
              <ProtectedRoute>
                <RoleDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nurse"
            element={
              <ProtectedRoute allowedRoles={['nurse']}>
                <NurseDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility"
            element={
              <ProtectedRoute allowedRoles={['facility']}>
                <FacilityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </Router>
  )
}

export default App
