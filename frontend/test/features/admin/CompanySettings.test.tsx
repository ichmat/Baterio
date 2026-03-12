import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CompanySettings } from '@/features/admin/CompanySettings'
import * as api from '@/features/admin/api'
import { toast } from 'sonner'
import type { CompanyInfoResponse } from '@/features/admin/types'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockCompanyInfo: CompanyInfoResponse = {
  id: 1,
  companyName: 'Baterio SARL',
  address: '12 rue des Artisans, 75011 Paris',
  siret: '12345678901234',
  vatNumber: 'FR12345678901',
  legalForm: 'SARL',
  insurancePolicyNumber: 'DEC-2024-001234',
  insuranceProvider: 'AXA Assurances',
  insuranceCoverage: 'France metropolitaine',
  defaultPaymentTerms: 'Paiement a 30 jours',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
}

const emptyCompanyInfo: CompanyInfoResponse = {
  id: 0,
  companyName: undefined,
  address: undefined,
  siret: undefined,
  vatNumber: undefined,
  legalForm: undefined,
  insurancePolicyNumber: undefined,
  insuranceProvider: undefined,
  insuranceCoverage: undefined,
  defaultPaymentTerms: undefined,
  createdAt: '0001-01-01T00:00:00Z',
  updatedAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CompanySettings', () => {
  it('renders the form with section cards', async () => {
    vi.mocked(api.getCompanyInfo).mockResolvedValue(emptyCompanyInfo)
    render(<CompanySettings />)

    await waitFor(() => {
      expect(screen.getByText('Informations générales')).toBeInTheDocument()
    })

    expect(screen.getByText('Identification fiscale')).toBeInTheDocument()
    expect(screen.getByText('Assurance décennale')).toBeInTheDocument()
    expect(screen.getByText('Conditions de paiement')).toBeInTheDocument()
    expect(screen.getByText('Enregistrer')).toBeInTheDocument()
  })

  it('loads existing company data into form fields', async () => {
    vi.mocked(api.getCompanyInfo).mockResolvedValue(mockCompanyInfo)
    render(<CompanySettings />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Baterio SARL')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('12345678901234')).toBeInTheDocument()
    expect(screen.getByDisplayValue('FR12345678901')).toBeInTheDocument()
    expect(screen.getByDisplayValue('AXA Assurances')).toBeInTheDocument()
  })

  it('submits form and shows success toast', async () => {
    vi.mocked(api.getCompanyInfo).mockResolvedValue(emptyCompanyInfo)
    vi.mocked(api.updateCompanyInfo).mockResolvedValue(mockCompanyInfo)
    const user = userEvent.setup()

    render(<CompanySettings />)

    await waitFor(() => {
      expect(screen.getByText('Enregistrer')).toBeInTheDocument()
    })

    const companyNameInput = screen.getByLabelText('Raison sociale')
    await user.type(companyNameInput, 'Test SARL')

    await user.click(screen.getByText('Enregistrer'))

    await waitFor(() => {
      expect(api.updateCompanyInfo).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Informations enregistrées')
    })
  })

  it('shows error toast on load failure', async () => {
    vi.mocked(api.getCompanyInfo).mockRejectedValue(new Error('Network error'))
    render(<CompanySettings />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erreur lors du chargement des informations entreprise')
    })
  })

  it('shows loading state initially', () => {
    vi.mocked(api.getCompanyInfo).mockImplementation(() => new Promise(() => {}))
    render(<CompanySettings />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })
})
