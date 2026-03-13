import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { UserInfo } from './types'
import {
  apiClient,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/api-client'
import type { LoginResponse } from './types'

export interface AuthContextType {
  user: UserInfo | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearAuth = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    setAccessToken(response.accessToken)
    setRefreshToken(response.refreshToken)
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' })
    } catch (err) {
      console.warn('Logout API call failed:', err)
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  const refreshSession = useCallback(async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuth()
      return
    }

    try {
      const response = await apiClient<LoginResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })

      setAccessToken(response.accessToken)
      setRefreshToken(response.refreshToken)
      setUser(response.user)
    } catch (err) {
      console.warn('Session refresh failed:', err)
      clearAuth()
    }
  }, [clearAuth])

  // Try to restore session on mount
  useEffect(() => {
    const init = async () => {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await refreshSession()
      }
      setIsLoading(false)
    }
    init()
  }, [refreshSession])

  // Inactivity timeout (AC #3 — NFR9)
  useEffect(() => {
    if (!user) return

    let timer: ReturnType<typeof setTimeout>

    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        clearAuth()
        window.location.href = '/login'
      }, INACTIVITY_TIMEOUT)
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timer)
      events.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [user, clearAuth])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
