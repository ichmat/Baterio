import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserManagement } from '@/features/admin/UserManagement'
import { AuthContext, type AuthContextType } from '@/features/auth/AuthContext'
import * as api from '@/features/admin/api'
import type { UserResponse } from '@/features/admin/types'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockUsers: UserResponse[] = [
  { id: 1, email: 'admin@baterio.fr', firstName: 'Admin', lastName: 'Baterio', role: 'Admin', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, email: 'ouvrier@baterio.fr', firstName: 'Ouvrier', lastName: 'Test', role: 'Ouvrier', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 3, email: 'inactif@baterio.fr', firstName: 'Inactif', lastName: 'User', role: 'Chef', isActive: false, createdAt: '2026-01-01T00:00:00Z' },
]

const mockAuth: AuthContextType = {
  user: { id: 1, email: 'admin@baterio.fr', firstName: 'Admin', lastName: 'Baterio', role: 'Admin', tenantId: 1 },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}

function renderWithAuth(authValue: AuthContextType = mockAuth) {
  return render(
    <AuthContext.Provider value={authValue}>
      <UserManagement />
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getUsers).mockResolvedValue(mockUsers)
})

describe('UserManagement', () => {
  it('renders user list with roles and statuses', async () => {
    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByText('Admin Baterio')).toBeInTheDocument()
    })

    expect(screen.getByText('Ouvrier Test')).toBeInTheDocument()
    expect(screen.getByText('Inactif User')).toBeInTheDocument()
    expect(screen.getByText('admin@baterio.fr')).toBeInTheDocument()
    expect(screen.getByText('ouvrier@baterio.fr')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    vi.mocked(api.getUsers).mockImplementation(() => new Promise(() => {}))
    renderWithAuth()
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('renders add user button', async () => {
    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByText('Ajouter un utilisateur')).toBeInTheDocument()
    })
  })

  it('opens create user dialog when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByText('Ajouter un utilisateur')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Ajouter un utilisateur'))

    await waitFor(() => {
      expect(screen.getByText('Prénom')).toBeInTheDocument()
    })
  })

  it('displays active/inactive badges', async () => {
    renderWithAuth()

    await waitFor(() => {
      expect(screen.getAllByText('Actif')).toHaveLength(2)
      expect(screen.getByText('Inactif')).toBeInTheDocument()
    })
  })

  it('hides role selector and toggle for current user', async () => {
    renderWithAuth()

    await waitFor(() => {
      expect(screen.getByText('Admin Baterio')).toBeInTheDocument()
    })

    // Current user (id=1) should show "—" instead of actions
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
