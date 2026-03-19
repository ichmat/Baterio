import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { EditDevisForm } from '@/features/devis/EditDevisForm'
import * as devisApi from '@/features/devis/api'
import * as adminApi from '@/features/admin/api'
import type { QuoteResponse } from '@/features/devis/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/devis/api')
vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock CustomerAutocomplete
vi.mock('@/features/clients/CustomerAutocomplete', () => ({
  CustomerAutocomplete: () => <div data-testid="customer-autocomplete" />,
}))
vi.mock('@/features/clients/CreateClientDialog', () => ({
  CreateClientDialog: () => null,
}))

const mockQuote: QuoteResponse = {
  id: 1,
  reference: 'DEV-2026-0001',
  subject: 'Rénovation cuisine',
  status: 'Draft',
  priority: 'High',
  customerId: 10,
  customerName: 'Dupont Jean',
  validityDate: '2026-04-19',
  estimatedDuration: '3 semaines',
  siteAddress: '1 rue de Paris',
  amountExclTax: 1500,
  taxRate: 20,
  amountInclTax: 1800,
  reminderDate: null,
  customFields: null,
  legalMentions: null,
  notes: 'Notes existantes',
  createdBy: 1,
  createdByName: 'Martin Sophie',
  createdAt: '2026-03-19T10:00:00Z',
  updatedAt: null,
  lines: [
    { id: 1, description: 'Peinture', quantity: 2, unitPriceExclTax: 500, lineTotalExclTax: 1000, displayOrder: 0 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(adminApi.getCustomFields).mockResolvedValue([])
})

function renderEdit(onSuccess = vi.fn()) {
  return renderWithProviders(
    <MemoryRouter>
      <EditDevisForm quote={mockQuote} onSuccess={onSuccess} />
    </MemoryRouter>,
  )
}

describe('EditDevisForm', () => {
  it('champs pré-remplis avec les données du devis', () => {
    renderEdit()

    expect(screen.getByDisplayValue('Rénovation cuisine')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Notes existantes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('3 semaines')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1 rue de Paris')).toBeInTheDocument()
  })

  it('lignes pré-remplies', () => {
    renderEdit()

    expect(screen.getByDisplayValue('Peinture')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('500')).toBeInTheDocument()
  })

  it('soumission PUT réussie → toast + callback', async () => {
    const { toast } = await import('sonner')
    const onSuccess = vi.fn()
    vi.mocked(devisApi.updateQuote).mockResolvedValue({
      ...mockQuote,
      subject: 'Rénovation modifiée',
    })

    const user = userEvent.setup()
    renderEdit(onSuccess)

    const subjectInput = screen.getByDisplayValue('Rénovation cuisine')
    await user.clear(subjectInput)
    await user.type(subjectInput, 'Rénovation modifiée')

    // Submit via fireEvent to bypass potential button/event issues
    const form = document.querySelector('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(devisApi.updateQuote).toHaveBeenCalled()
    })
    expect(toast.success).toHaveBeenCalledWith('Devis modifié')
    expect(onSuccess).toHaveBeenCalled()
  })

  it('client est en lecture seule en mode édition', () => {
    renderEdit()

    // Customer field should be read-only (not an autocomplete)
    expect(screen.queryByTestId('customer-autocomplete')).not.toBeInTheDocument()
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
  })
})
