import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import apiClient, { authUrl } from '../api/axios'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (payload: LoginPayload) => Promise<AuthResponse>
  register: (payload: RegisterPayload) => Promise<AuthResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const TOKEN_KEY = 'nivano_token'
const USER_KEY = 'nivano_user'

function getSavedUser(): User | null {
  const value = localStorage.getItem(USER_KEY)
  if (!value) return null
  try {
    return JSON.parse(value) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(() => getSavedUser())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    if (user) return

    const loadUser = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiClient.get<User>(authUrl('/auth/me'))
        setUser(response.data)
        localStorage.setItem(USER_KEY, JSON.stringify(response.data))
      } catch (err) {
        console.error(err)
        setToken(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token, user])

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [user])

  const login = async (payload: LoginPayload) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<AuthResponse>(authUrl('/auth/login'), payload)
      setToken(response.data.access_token)
      localStorage.setItem(TOKEN_KEY, response.data.access_token)
      setUser({
        id: response.data.id,
        email: response.data.email,
        role: response.data.role,
        status: response.data.status,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      })
      localStorage.setItem(USER_KEY, JSON.stringify({
        id: response.data.id,
        email: response.data.email,
        role: response.data.role,
        status: response.data.status,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
      }))
      return response.data
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      }
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload: RegisterPayload) => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.post(authUrl('/auth/register'), payload)
      return await login({ email: payload.email, password: payload.password })
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      }
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setError(null)
  }

  const value = useMemo(
    () => ({ user, token, loading, error, login, register, logout }),
    [user, token, loading, error]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
