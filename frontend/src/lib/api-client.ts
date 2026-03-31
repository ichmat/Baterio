import type { LoginResponse } from '@/features/auth/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5180/api'

// Access token stored in memory (not localStorage) for security
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem('refreshToken', token)
  } else {
    localStorage.removeItem('refreshToken')
  }
}

let isRefreshing = false
let refreshPromise: Promise<LoginResponse | null> | null = null

async function tryRefreshToken(): Promise<LoginResponse | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        setAccessToken(null)
        setRefreshToken(null)
        return null
      }

      const data: LoginResponse = await response.json()
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      return data
    } catch {
      setAccessToken(null)
      setRefreshToken(null)
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/** Fetch brut avec Bearer token et 401 refresh — retourne la Response (pour blobs, streams) */
export async function apiFetchRaw(endpoint: string, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })

  if (response.status === 401 && accessToken) {
    const refreshResult = await tryRefreshToken()
    if (refreshResult) {
      headers['Authorization'] = `Bearer ${refreshResult.accessToken}`
      response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
    } else {
      window.location.href = '/login'
      throw { type: 'AuthError', status: 401, message: 'Session expirée' }
    }
  }

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`)
  }

  return response
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }

  // Don't set Content-Type for FormData — browser sets it with boundary
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // 401 interceptor: try refresh then replay
  if (response.status === 401 && accessToken) {
    const refreshResult = await tryRefreshToken()
    if (refreshResult) {
      headers['Authorization'] = `Bearer ${refreshResult.accessToken}`
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({
          type: 'ServerError',
          status: retryResponse.status,
          message: 'Une erreur inattendue s\'est produite',
        }))
        throw error
      }

      return retryResponse.json()
    }

    // Refresh failed — redirect to login
    window.location.href = '/login'
    throw { type: 'AuthError', status: 401, message: 'Session expirée' }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      type: 'ServerError',
      status: response.status,
      message: 'Une erreur inattendue s\'est produite',
    }))
    throw error
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}
