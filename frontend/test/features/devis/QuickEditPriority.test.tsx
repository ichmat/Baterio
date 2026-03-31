import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickEditPriority } from '@/features/devis/QuickEditPriority'
import * as devisApi from '@/features/devis/api'
import type { QuoteResponse } from '@/features/devis/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/devis/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockQuote: QuoteResponse = {
  id: 1,
  reference: 'DEV-2026-0001',
  subject: 'Test',
  status: 'Draft',
  priority: 'Normal',
  customerId: 10,
  customerName: 'Dupont Jean',
  validityDate: null,
  estimatedDuration: null,
  siteAddress: null,
  amountExclTax: null,
  taxRate: 20,
  amountInclTax: null,
  reminderDate: null,
  customFields: null,
  legalMentions: null,
  notes: null,
  createdBy: 1,
  createdByName: 'Martin Sophie',
  createdAt: '2026-03-19T10:00:00Z',
  updatedAt: null,
  lines: [
    { id: 1, description: 'Ligne 1', quantity: 1, unitPriceExclTax: 100, lineTotalExclTax: 100, displayOrder: 0 },
  ],
}

const mockOnUpdate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('QuickEditPriority', () => {
  it('affiche le badge avec la priorité actuelle', () => {
    renderWithProviders(<QuickEditPriority quote={mockQuote} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Normale')).toBeInTheDocument()
  })

  it('clic → popover avec 3 options', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickEditPriority quote={mockQuote} onUpdate={mockOnUpdate} />)

    await user.click(screen.getByText('Normale'))

    await waitFor(() => {
      expect(screen.getByText('Haute')).toBeInTheDocument()
      expect(screen.getByText('Basse')).toBeInTheDocument()
    })
  })

  it('sélection → appel PUT avec tous les champs + toast', async () => {
    const { toast } = await import('sonner')
    vi.mocked(devisApi.updateQuote).mockResolvedValue({} as any)

    const user = userEvent.setup()
    renderWithProviders(<QuickEditPriority quote={mockQuote} onUpdate={mockOnUpdate} />)

    await user.click(screen.getByText('Normale'))

    await waitFor(() => {
      expect(screen.getByText('Haute')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Haute'))

    await waitFor(() => {
      expect(devisApi.updateQuote).toHaveBeenCalledWith(1, expect.objectContaining({
        subject: 'Test',
        priority: 'High',
        lines: expect.any(Array),
      }))
    })
    expect(toast.success).toHaveBeenCalledWith('Priorité mise à jour')
    expect(mockOnUpdate).toHaveBeenCalled()
  })
})
