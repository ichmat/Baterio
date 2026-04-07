import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AssignWorkerDialog } from '@/features/chantiers/AssignWorkerDialog'
import * as sitesApi from '@/features/chantiers/api'
import * as adminApi from '@/features/admin/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockUsers = [
  { id: 100, email: 'ouvrier1@test.fr', firstName: 'Pierre', lastName: 'Martin', role: 'Ouvrier' as const, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 101, email: 'ouvrier2@test.fr', firstName: 'Jean', lastName: 'Dupont', role: 'Ouvrier' as const, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 102, email: 'chef@test.fr', firstName: 'Sophie', lastName: 'Chef', role: 'Chef' as const, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
]

const mockPresets = [
  { label: 'Matin', startTime: '08:00', endTime: '12:00', order: 0 },
  { label: 'Après-midi', startTime: '12:00', endTime: '17:00', order: 1 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminApi.getUsers).mockResolvedValue(mockUsers)
  vi.mocked(sitesApi.getAssignmentPresets).mockResolvedValue(mockPresets)
  vi.mocked(sitesApi.checkConflicts).mockResolvedValue([])
  vi.mocked(sitesApi.createBatchAssignment).mockResolvedValue([])
})

describe('AssignWorkerDialog', () => {
  it('affiche uniquement les ouvriers actifs', async () => {
    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    // Chef should not appear
    expect(screen.queryByText('Chef Sophie')).not.toBeInTheDocument()
  })

  it('affiche les modes d\'attribution après sélection d\'un ouvrier', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    // Click on the first ouvrier checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    expect(screen.getByText('Toute la durée')).toBeInTheDocument()
    expect(screen.getByText('Date + preset')).toBeInTheDocument()
    expect(screen.getByText('Plage + preset')).toBeInTheDocument()
    expect(screen.getByText('Datetime libre')).toBeInTheDocument()
  })

  it('affiche les presets horaires en mode date_preset', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    await user.click(screen.getByText('Date + preset'))

    await waitFor(() => {
      expect(screen.getByText(/Matin/)).toBeInTheDocument()
      expect(screen.getByText(/Après-midi/)).toBeInTheDocument()
    })
  })

  it('soumet les attributions et affiche toast succès', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    renderWithProviders(<AssignWorkerDialog siteId={10} open={true} onOpenChange={onOpenChange} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    await user.click(screen.getByText(/attribuer \(1\)/i))

    await waitFor(() => {
      expect(sitesApi.createBatchAssignment).toHaveBeenCalledWith(10, {
        assignments: [expect.objectContaining({ userId: 100, mode: 'full_duration' })],
      })
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Équipe attribuée')
  })

  // --- H10: Tests dialog de conflits ---

  it('affiche le dialog de conflits quand checkConflicts retourne des résultats', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesApi.checkConflicts).mockResolvedValue([
      { type: 'conflict', message: 'Pierre a un créneau en conflit sur « Chantier B »', conflictingSiteId: 20, conflictingSiteName: 'Chantier B', existingStart: '2026-04-10T08:00:00Z', existingEnd: '2026-04-10T12:00:00Z' },
    ])

    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(screen.getByText(/attribuer \(1\)/i))

    await waitFor(() => {
      expect(screen.getByText('Conflits détectés')).toBeInTheDocument()
      expect(screen.getByText(/Chantier B/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /confirmer malgré les conflits/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
  })

  it('soumet malgré conflits quand l\'utilisateur confirme', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesApi.checkConflicts).mockResolvedValue([
      { type: 'info', message: 'Pierre est attribué pour toute la durée sur « Chantier B »', conflictingSiteId: 20, conflictingSiteName: 'Chantier B', existingStart: null, existingEnd: null },
    ])

    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(screen.getByText(/attribuer \(1\)/i))

    await waitFor(() => {
      expect(screen.getByText('Informations')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /confirmer malgré les conflits/i }))

    await waitFor(() => {
      expect(sitesApi.createBatchAssignment).toHaveBeenCalledWith(10, {
        assignments: [expect.objectContaining({ userId: 100, mode: 'full_duration' })],
      })
    })
  })

  // --- M13: Tests modes range_preset, free, multi-sélection, erreurs API ---

  it('mode range_preset affiche les champs de plage de dates', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(screen.getByText('Plage + preset'))

    // Should show 2 date inputs for start/end range
    const dateInputs = screen.getAllByDisplayValue('')
    const rangeInputs = dateInputs.filter(i => i.getAttribute('type') === 'date')
    expect(rangeInputs.length).toBeGreaterThanOrEqual(2)

    // Presets should be visible
    expect(screen.getByText(/Matin/)).toBeInTheDocument()
  })

  it('mode free affiche les champs datetime-local', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(screen.getByText('Datetime libre'))

    const datetimeInputs = screen.getAllByDisplayValue('').filter(i => i.getAttribute('type') === 'datetime-local')
    expect(datetimeInputs.length).toBeGreaterThanOrEqual(2)
  })

  it('multi-sélection affiche le compteur correct et soumet pour chaque ouvrier', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    expect(screen.getByText(/attribuer \(2\)/i)).toBeInTheDocument()

    await user.click(screen.getByText(/attribuer \(2\)/i))

    await waitFor(() => {
      expect(sitesApi.createBatchAssignment).toHaveBeenCalledWith(10, {
        assignments: expect.arrayContaining([
          expect.objectContaining({ userId: 100, mode: 'full_duration' }),
          expect.objectContaining({ userId: 101, mode: 'full_duration' }),
        ]),
      })
    })
  })

  it('affiche toast erreur quand la soumission échoue', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesApi.createBatchAssignment).mockRejectedValue(new Error())

    renderWithProviders(<AssignWorkerDialog siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(screen.getByText(/attribuer \(1\)/i))

    await waitFor(async () => {
      const { toast } = await import('sonner')
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
