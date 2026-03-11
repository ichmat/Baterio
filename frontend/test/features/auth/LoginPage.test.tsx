import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthContext'
import { LoginPage } from '@/features/auth/LoginPage'

const mockApiClient = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(() => null),
}))

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('LoginPage', () => {
  it('renders the login form', () => {
    renderLoginPage()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })

  it('shows error message on failed login', async () => {
    const user = userEvent.setup()
    mockApiClient.mockRejectedValueOnce({
      message: 'Email ou mot de passe incorrect',
    })

    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'wrong@email.com')
    await user.type(screen.getByLabelText('Mot de passe'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument()
    })
  })

  it('calls login API on form submission', async () => {
    const user = userEvent.setup()
    mockApiClient.mockResolvedValueOnce({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresAt: new Date().toISOString(),
      user: {
        id: 1,
        email: 'test@baterio.fr',
        firstName: 'Test',
        lastName: 'User',
        role: 'Admin',
        tenantId: 1,
      },
    })

    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'test@baterio.fr')
    await user.type(screen.getByLabelText('Mot de passe'), 'Test123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@baterio.fr', password: 'Test123!' }),
      })
    })
  })

  it('disables button while submitting', async () => {
    const user = userEvent.setup()
    let resolveLogin: (value: unknown) => void
    mockApiClient.mockReturnValueOnce(
      new Promise((resolve) => { resolveLogin = resolve }),
    )

    renderLoginPage()

    await user.type(screen.getByLabelText('Email'), 'test@baterio.fr')
    await user.type(screen.getByLabelText('Mot de passe'), 'Test123!')
    await user.click(screen.getByRole('button', { name: 'Se connecter' }))

    expect(screen.getByRole('button', { name: 'Connexion...' })).toBeDisabled()

    resolveLogin!({
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: new Date().toISOString(),
      user: { id: 1, email: 'a@b.c', firstName: null, lastName: null, role: 'Admin', tenantId: 1 },
    })
  })
})
