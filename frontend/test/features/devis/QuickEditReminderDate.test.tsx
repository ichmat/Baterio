import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickEditReminderDate } from '@/features/devis/QuickEditReminderDate'
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

const baseQuote: QuoteResponse = {
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

describe('QuickEditReminderDate', () => {
  it('affiche "Ajouter une relance" si pas de date', () => {
    renderWithProviders(<QuickEditReminderDate quote={baseQuote} onUpdate={mockOnUpdate} />)

    expect(screen.getByText('Ajouter une relance')).toBeInTheDocument()
  })

  it('affiche la date formatée si une date existe', () => {
    const quote = { ...baseQuote, reminderDate: '2026-04-15' }
    renderWithProviders(<QuickEditReminderDate quote={quote} onUpdate={mockOnUpdate} />)

    // fr-FR format: 15/04/2026
    expect(screen.getByText('15/04/2026')).toBeInTheDocument()
  })

  it('clic → popover avec DatePicker', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuickEditReminderDate quote={baseQuote} onUpdate={mockOnUpdate} />)

    await user.click(screen.getByText('Ajouter une relance'))

    await waitFor(() => {
      expect(screen.getByText('Date de relance')).toBeInTheDocument()
      expect(screen.getByText('Confirmer')).toBeInTheDocument()
    })
  })

  it('sélection date → appel PUT avec tous les champs', async () => {
    const { toast } = await import('sonner')
    vi.mocked(devisApi.updateQuote).mockResolvedValue({} as any)

    const user = userEvent.setup()
    renderWithProviders(<QuickEditReminderDate quote={baseQuote} onUpdate={mockOnUpdate} />)

    await user.click(screen.getByText('Ajouter une relance'))

    await waitFor(() => {
      expect(screen.getByText('Date de relance')).toBeInTheDocument()
    })

    const dateInput = document.querySelector('input[type="date"]')!
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } })

    await user.click(screen.getByText('Confirmer'))

    await waitFor(() => {
      expect(devisApi.updateQuote).toHaveBeenCalledWith(1, expect.objectContaining({
        subject: 'Test',
        reminderDate: '2026-05-01',
        lines: expect.any(Array),
      }))
    })
    expect(toast.success).toHaveBeenCalledWith('Date de relance mise à jour')
    expect(mockOnUpdate).toHaveBeenCalled()
  })

  it('suppression → appel PUT avec reminderDate null', async () => {
    const { toast } = await import('sonner')
    vi.mocked(devisApi.updateQuote).mockResolvedValue({} as any)

    const quote = { ...baseQuote, reminderDate: '2026-04-15' }
    const user = userEvent.setup()
    renderWithProviders(<QuickEditReminderDate quote={quote} onUpdate={mockOnUpdate} />)

    await user.click(screen.getByText('15/04/2026'))

    await waitFor(() => {
      expect(screen.getByText('Supprimer la relance')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Supprimer la relance'))

    await waitFor(() => {
      expect(devisApi.updateQuote).toHaveBeenCalledWith(1, expect.objectContaining({
        subject: 'Test',
        reminderDate: null,
      }))
    })
    expect(toast.success).toHaveBeenCalledWith('Date de relance mise à jour')
  })
})
