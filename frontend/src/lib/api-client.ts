const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      type: 'ServerError',
      status: response.status,
      message: 'Une erreur inattendue s\'est produite',
    }))
    throw error
  }

  return response.json()
}
