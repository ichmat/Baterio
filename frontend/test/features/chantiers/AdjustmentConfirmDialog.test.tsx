import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdjustmentConfirmDialog } from '@/features/chantiers/AdjustmentConfirmDialog'
import * as sitesApi from '@/features/chantiers/api'
import type { ProposedAdjustment } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockAdjustments: ProposedAdjustment[] = [
  {
    assignmentId: 1,
    userFullName: 'Martin Pierre',
    oldStartDatetime: '2026-04-10T08:00:00Z',
    oldEndDatetime: '2026-04-25T17:00:00Z',
    newStartDatetime: '2026-04-10T08:00:00Z',
    newEndDatetime: '2026-04-22T23:59:59Z',
  },
  {
    assignmentId: 2,
    userFullName: 'Dupont Jean',
    oldStartDatetime: '2026-04-02T08:00:00Z',
    oldEndDatetime: '2026-04-15T17:00:00Z',
    newStartDatetime: '2026-04-05T00:00:00Z',
    newEndDatetime: '2026-04-15T17:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sitesApi.confirmAdjustments).mockResolvedValue([])
})

describe('AdjustmentConfirmDialog', () => {
  it('affiche le titre et la liste des ajustements proposés', () => {
    renderWithProviders(
      <AdjustmentConfirmDialog
        siteId={10}
        adjustments={mockAdjustments}
        open={true}
        onOpenChange={() => {}}
        onConfirmed={() => {}}
        onCancel={() => {}}
      />
    )

    expect(screen.getByText('Ajustements nécessaires')).toBeInTheDocument()
    expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmer les ajustements/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ignorer les ajustements/i })).toBeInTheDocument()
  })

  it('confirmer appelle confirmAdjustments et onConfirmed', async () => {
    const user = userEvent.setup()
    const onConfirmed = vi.fn()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <AdjustmentConfirmDialog
        siteId={10}
        adjustments={mockAdjustments}
        open={true}
        onOpenChange={onOpenChange}
        onConfirmed={onConfirmed}
        onCancel={() => {}}
      />
    )

    await user.click(screen.getByRole('button', { name: /confirmer les ajustements/i }))

    await waitFor(() => {
      expect(sitesApi.confirmAdjustments).toHaveBeenCalledWith(10, [
        { assignmentId: 1, newStartDatetime: '2026-04-10T08:00:00Z', newEndDatetime: '2026-04-22T23:59:59Z' },
        { assignmentId: 2, newStartDatetime: '2026-04-05T00:00:00Z', newEndDatetime: '2026-04-15T17:00:00Z' },
      ])
    })

    expect(onConfirmed).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Attributions ajustées')
  })

  it('annuler appelle onCancel sans appeler confirmAdjustments', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <AdjustmentConfirmDialog
        siteId={10}
        adjustments={mockAdjustments}
        open={true}
        onOpenChange={onOpenChange}
        onConfirmed={() => {}}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: /ignorer les ajustements/i }))

    expect(onCancel).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(sitesApi.confirmAdjustments).not.toHaveBeenCalled()
  })

  it('affiche toast erreur si la confirmation échoue', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesApi.confirmAdjustments).mockRejectedValue(new Error('Server error'))

    renderWithProviders(
      <AdjustmentConfirmDialog
        siteId={10}
        adjustments={mockAdjustments}
        open={true}
        onOpenChange={() => {}}
        onConfirmed={() => {}}
        onCancel={() => {}}
      />
    )

    await user.click(screen.getByRole('button', { name: /confirmer les ajustements/i }))

    await waitFor(async () => {
      const { toast } = await import('sonner')
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'ajustement")
    })
  })
})
