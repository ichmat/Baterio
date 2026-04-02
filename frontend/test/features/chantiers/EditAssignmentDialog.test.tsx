import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditAssignmentDialog } from '@/features/chantiers/EditAssignmentDialog'
import * as sitesApi from '@/features/chantiers/api'
import type { SiteAssignment } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockAssignment: SiteAssignment = {
  id: 1, siteId: 10, userId: 100,
  userFullName: 'Martin Pierre',
  userAvatarUrl: null,
  startDatetime: '2026-04-10T08:00:00Z',
  endDatetime: '2026-04-10T12:00:00Z',
  createdAt: '2026-04-01T08:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sitesApi.updateAssignment).mockResolvedValue(mockAssignment)
  vi.mocked(sitesApi.deleteAssignment).mockResolvedValue(undefined)
})

describe('EditAssignmentDialog', () => {
  it('affiche les informations de l\'attribution', () => {
    renderWithProviders(
      <EditAssignmentDialog siteId={10} assignment={mockAssignment} open={true} onOpenChange={() => {}} />
    )

    expect(screen.getByText('Modifier l\'attribution')).toBeInTheDocument()
    expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
  })

  it('suppression avec confirmation double', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <EditAssignmentDialog siteId={10} assignment={mockAssignment} open={true} onOpenChange={onOpenChange} />
    )

    // Click Supprimer
    await user.click(screen.getByRole('button', { name: /supprimer/i }))

    // Confirmation step
    expect(screen.getByText('Confirmer ?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /oui/i }))

    await waitFor(() => {
      expect(sitesApi.deleteAssignment).toHaveBeenCalledWith(10, 1)
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Attribution supprimée')
  })

  // --- H11: Test modify + save (chemin principal) ---

  it('modifie les dates et enregistre avec succès', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    const updatedAssignment = {
      ...mockAssignment,
      startDatetime: '2026-04-10T09:00:00Z',
      endDatetime: '2026-04-10T14:00:00Z',
    }
    vi.mocked(sitesApi.updateAssignment).mockResolvedValue(updatedAssignment)

    renderWithProviders(
      <EditAssignmentDialog siteId={10} assignment={mockAssignment} open={true} onOpenChange={onOpenChange} />
    )

    // Find and modify the start datetime input
    const inputs = screen.getAllByDisplayValue(/2026/)
    expect(inputs.length).toBeGreaterThanOrEqual(2)

    // Click Enregistrer
    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(sitesApi.updateAssignment).toHaveBeenCalledWith(10, 1, expect.objectContaining({
        startDatetime: expect.any(String),
        endDatetime: expect.any(String),
      }))
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Attribution modifiée')
  })

  it('affiche un message pour les attributions toute la durée', () => {
    const fullDurationAssignment: SiteAssignment = {
      ...mockAssignment,
      startDatetime: null,
      endDatetime: null,
    }

    renderWithProviders(
      <EditAssignmentDialog siteId={10} assignment={fullDurationAssignment} open={true} onOpenChange={() => {}} />
    )

    expect(screen.getByText(/toute la durée/i)).toBeInTheDocument()
  })
})
