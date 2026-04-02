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
    renderWithProviders(<AssignWorkerDialog siteId={10} open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    // Chef should not appear
    expect(screen.queryByText('Chef Sophie')).not.toBeInTheDocument()
  })

  it('affiche les modes d\'attribution après sélection d\'un ouvrier', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignWorkerDialog siteId={10} open={true} onOpenChange={() => {}} />)

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
    renderWithProviders(<AssignWorkerDialog siteId={10} open={true} onOpenChange={() => {}} />)

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
})
