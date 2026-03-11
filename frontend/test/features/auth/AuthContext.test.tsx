import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/features/auth/AuthContext'
import { useAuth } from '@/features/auth/useAuth'

const mockApiClient = vi.fn()
const mockSetAccessToken = vi.fn()
const mockSetRefreshToken = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
  setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
  getAccessToken: vi.fn(() => null),
  setRefreshToken: (...args: unknown[]) => mockSetRefreshToken(...args),
  getRefreshToken: vi.fn(() => null),
}))

function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => login('test@baterio.fr', 'Test123!')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('AuthContext', () => {
  it('starts with no user and finishes loading', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('login sets user on success', async () => {
    const user = userEvent.setup()
    mockApiClient.mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: new Date().toISOString(),
      user: { id: 1, email: 'test@baterio.fr', firstName: 'Test', lastName: 'User', role: 'Admin', tenantId: 1 },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('user').textContent).toBe('test@baterio.fr')
    })

    expect(mockSetAccessToken).toHaveBeenCalledWith('token')
    expect(mockSetRefreshToken).toHaveBeenCalledWith('refresh')
  })

  it('logout clears user', async () => {
    const user = userEvent.setup()
    // Login first
    mockApiClient.mockResolvedValueOnce({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: new Date().toISOString(),
      user: { id: 1, email: 'test@baterio.fr', firstName: 'Test', lastName: 'User', role: 'Admin', tenantId: 1 },
    })
    // Logout call
    mockApiClient.mockResolvedValueOnce(undefined)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await user.click(screen.getByText('Login'))
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true')
    })

    await user.click(screen.getByText('Logout'))
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('user').textContent).toBe('none')
    })

    expect(mockSetAccessToken).toHaveBeenCalledWith(null)
    expect(mockSetRefreshToken).toHaveBeenCalledWith(null)
  })
})
