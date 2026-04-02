import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditChantierForm } from '@/features/chantiers/EditChantierForm'
import * as sitesApi from '@/features/chantiers/api'
import * as adminApi from '@/features/admin/api'
import type { SiteResponse } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockSite: SiteResponse = {
  id: 10,
  reference: 'CH-2026-010',
  subject: 'Chantier test',
  status: 'InProgress',
  customerId: 1,
  customerName: 'Client Test',
  quoteId: null,
  quoteReference: null,
  siteAddress: '10 rue test',
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  customFields: null,
  notes: null,
  createdBy: 1,
  createdByName: 'Chef Test',
  createdAt: '2026-03-31T08:00:00Z',
  updatedAt: null,
  assignedWorkers: null,
  proposedAdjustments: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminApi.getCustomFields).mockResolvedValue([])
  vi.mocked(sitesApi.confirmAdjustments).mockResolvedValue([])
})

describe('EditChantierForm — câblage AdjustmentConfirmDialog (C4/AC5)', () => {
  it('affiche le dialog d\'ajustement quand updateSite retourne des proposedAdjustments', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    vi.mocked(sitesApi.updateSite).mockResolvedValue({
      ...mockSite,
      endDate: '2026-04-22',
      proposedAdjustments: [
        {
          assignmentId: 1,
          userFullName: 'Martin Pierre',
          oldStartDatetime: '2026-04-10T08:00:00Z',
          oldEndDatetime: '2026-04-25T17:00:00Z',
          newStartDatetime: '2026-04-10T08:00:00Z',
          newEndDatetime: '2026-04-22T23:59:59Z',
        },
      ],
    })

    renderWithProviders(<EditChantierForm site={mockSite} onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(sitesApi.updateSite).toHaveBeenCalled()
    })

    // AdjustmentConfirmDialog should appear
    await waitFor(() => {
      expect(screen.getByText('Ajustements nécessaires')).toBeInTheDocument()
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    // onSuccess should NOT have been called yet (waiting for user decision)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('appelle onSuccess directement quand pas d\'ajustements', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    vi.mocked(sitesApi.updateSite).mockResolvedValue({
      ...mockSite,
      proposedAdjustments: null,
    })

    renderWithProviders(<EditChantierForm site={mockSite} onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })

    // No adjustment dialog
    expect(screen.queryByText('Ajustements nécessaires')).not.toBeInTheDocument()
  })

  it('confirmer les ajustements ferme le dialog et appelle onSuccess', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()

    vi.mocked(sitesApi.updateSite).mockResolvedValue({
      ...mockSite,
      endDate: '2026-04-22',
      proposedAdjustments: [
        {
          assignmentId: 1,
          userFullName: 'Martin Pierre',
          oldStartDatetime: '2026-04-10T08:00:00Z',
          oldEndDatetime: '2026-04-25T17:00:00Z',
          newStartDatetime: '2026-04-10T08:00:00Z',
          newEndDatetime: '2026-04-22T23:59:59Z',
        },
      ],
    })

    renderWithProviders(<EditChantierForm site={mockSite} onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(screen.getByText('Ajustements nécessaires')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /confirmer les ajustements/i }))

    await waitFor(() => {
      expect(sitesApi.confirmAdjustments).toHaveBeenCalledWith(10, [
        { assignmentId: 1, newStartDatetime: '2026-04-10T08:00:00Z', newEndDatetime: '2026-04-22T23:59:59Z' },
      ])
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
