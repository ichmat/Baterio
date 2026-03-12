import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPage } from '@/pages/AdminPage'
import { AuthContext, type AuthContextType } from '@/features/auth/AuthContext'
import * as api from '@/features/admin/api'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockAuth: AuthContextType = {
  user: { id: 1, email: 'admin@baterio.fr', firstName: 'Admin', lastName: 'Baterio', role: 'Admin', tenantId: 1 },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getUsers).mockResolvedValue([])
  vi.mocked(api.getCompanyInfo).mockResolvedValue({
    id: 0, companyName: undefined, address: undefined, siret: undefined,
    vatNumber: undefined, legalForm: undefined, insurancePolicyNumber: undefined,
    insuranceProvider: undefined, insuranceCoverage: undefined,
    defaultPaymentTerms: undefined, createdAt: '', updatedAt: null,
  })
  vi.mocked(api.getSubscriptionInfo).mockResolvedValue({
    plan: 'MVP Gratuit', activeUsers: 1, maxUsers: 10,
    tenantName: 'Test', createdAt: '',
  })
})

function renderPage() {
  return render(
    <AuthContext.Provider value={mockAuth}>
      <AdminPage />
    </AuthContext.Provider>,
  )
}

describe('AdminPage', () => {
  it('renders tabs for Utilisateurs and Entreprise', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Utilisateurs' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Entreprise' })).toBeInTheDocument()
    })
  })

  it('shows UserManagement by default', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Gestion des utilisateurs')).toBeInTheDocument()
    })
  })

  it('switches to Entreprise tab and shows company settings', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Entreprise' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Entreprise' }))

    await waitFor(() => {
      expect(screen.getByText('Informations générales')).toBeInTheDocument()
      expect(screen.getByText('Abonnement')).toBeInTheDocument()
    })
  })
})
