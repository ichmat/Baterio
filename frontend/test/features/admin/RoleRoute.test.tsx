import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AuthContext, type AuthContextType } from '@/features/auth/AuthContext'
import { RoleRoute } from '@/features/admin/RoleRoute'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const baseAuth: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}

function renderWithAuth(authValue: AuthContextType, initialRoute = '/admin') {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RoleRoute role="Admin">
                <div>Admin Content</div>
              </RoleRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RoleRoute', () => {
  it('renders content when user has correct role', () => {
    renderWithAuth({
      ...baseAuth,
      isAuthenticated: true,
      user: { id: 1, email: 'a@b.c', firstName: 'Admin', lastName: 'User', role: 'Admin', tenantId: 1 },
    })

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('redirects to home when user has wrong role', () => {
    renderWithAuth({
      ...baseAuth,
      isAuthenticated: true,
      user: { id: 2, email: 'o@b.c', firstName: 'Ouvrier', lastName: 'User', role: 'Ouvrier', tenantId: 1 },
    })

    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    renderWithAuth({ ...baseAuth, isAuthenticated: false })

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('shows loading state while checking auth', () => {
    renderWithAuth({ ...baseAuth, isLoading: true })

    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
})
