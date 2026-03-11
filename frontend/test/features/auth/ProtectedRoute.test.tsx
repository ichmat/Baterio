import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AuthContext, type AuthContextType } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'

function renderWithAuth(authValue: AuthContextType, initialRoute = '/') {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const baseAuth: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    renderWithAuth({ ...baseAuth, isAuthenticated: false })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('shows protected content when authenticated', () => {
    renderWithAuth({
      ...baseAuth,
      isAuthenticated: true,
      user: { id: 1, email: 'a@b.c', firstName: null, lastName: null, role: 'Admin', tenantId: 1 },
    })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('shows loading state while checking auth', () => {
    renderWithAuth({ ...baseAuth, isLoading: true })
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
})
