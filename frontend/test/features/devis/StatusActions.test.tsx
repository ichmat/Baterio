import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusActions } from '@/features/devis/StatusActions'
import * as devisApi from '@/features/devis/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/devis/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockOnStatusChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StatusActions', () => {
  it('Draft → bouton "Envoyer" visible, pas de "Valider"/"Refuser"', () => {
    renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Draft" onStatusChange={mockOnStatusChange} />,
    )

    expect(screen.getByText('Envoyer')).toBeInTheDocument()
    expect(screen.queryByText('Valider')).not.toBeInTheDocument()
    expect(screen.queryByText('Refuser')).not.toBeInTheDocument()
  })

  it('Sent → boutons "Valider" et "Refuser" visibles, pas de "Envoyer"', () => {
    renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Sent" onStatusChange={mockOnStatusChange} />,
    )

    expect(screen.getByText('Valider')).toBeInTheDocument()
    expect(screen.getByText('Refuser')).toBeInTheDocument()
    expect(screen.queryByText('Envoyer')).not.toBeInTheDocument()
  })

  it('Accepted → aucun bouton visible', () => {
    const { container } = renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Accepted" onStatusChange={mockOnStatusChange} />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('Refused → aucun bouton visible', () => {
    const { container } = renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Refused" onStatusChange={mockOnStatusChange} />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('clic "Envoyer" → appel PATCH directement (pas de dialog)', async () => {
    const { toast } = await import('sonner')
    vi.mocked(devisApi.updateQuoteStatus).mockResolvedValue({} as any)

    const user = userEvent.setup()
    renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Draft" onStatusChange={mockOnStatusChange} />,
    )

    await user.click(screen.getByText('Envoyer'))

    await waitFor(() => {
      expect(devisApi.updateQuoteStatus).toHaveBeenCalledWith(1, { status: 'Sent' })
    })
    expect(toast.success).toHaveBeenCalledWith('Statut mis à jour')
    expect(mockOnStatusChange).toHaveBeenCalled()
  })

  it('clic "Valider" → dialog de confirmation → clic confirmer → appel PATCH', async () => {
    const { toast } = await import('sonner')
    vi.mocked(devisApi.updateQuoteStatus).mockResolvedValue({} as any)

    const user = userEvent.setup()
    renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Sent" onStatusChange={mockOnStatusChange} />,
    )

    await user.click(screen.getByText('Valider'))

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument()
    })
    expect(screen.getByText(/Cette action est définitive/)).toBeInTheDocument()

    // Find the confirm button in the dialog (there are two "Valider" — one in actions, one in dialog)
    const confirmButtons = screen.getAllByText('Valider')
    // The last one is in the dialog footer
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(devisApi.updateQuoteStatus).toHaveBeenCalledWith(1, { status: 'Accepted' })
    })
    expect(toast.success).toHaveBeenCalledWith('Statut mis à jour')
  })

  it('clic "Refuser" → dialog de confirmation → clic annuler → pas d\'appel PATCH', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <StatusActions quoteId={1} currentStatus="Sent" onStatusChange={mockOnStatusChange} />,
    )

    await user.click(screen.getByText('Refuser'))

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Confirmer le changement de statut')).toBeInTheDocument()
    })

    // Click "Annuler"
    await user.click(screen.getByText('Annuler'))

    // Dialog should close, no PATCH call
    await waitFor(() => {
      expect(screen.queryByText('Confirmer le changement de statut')).not.toBeInTheDocument()
    })
    expect(devisApi.updateQuoteStatus).not.toHaveBeenCalled()
  })
})
