import axios from 'axios'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export const API_URLS = {
  auth: trimTrailingSlash(import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8001'),
  user: trimTrailingSlash(import.meta.env.VITE_USER_API_URL || 'http://localhost:8002'),
  shift: trimTrailingSlash(import.meta.env.VITE_SHIFT_API_URL || 'http://localhost:8003'),
  compliance: trimTrailingSlash(import.meta.env.VITE_COMPLIANCE_API_URL || 'http://localhost:8004'),
}

export function authUrl(path: string) {
  return `${API_URLS.auth}${path}`
}

export function userUrl(path: string) {
  return `${API_URLS.user}${path}`
}

export function shiftUrl(path: string) {
  return `${API_URLS.shift}${path}`
}

export function complianceUrl(path: string) {
  return `${API_URLS.compliance}${path}`
}

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('nivano_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
