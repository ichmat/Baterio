import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChantierEquipe } from '@/features/chantiers/ChantierEquipe'
import * as sitesApi from '@/features/chantiers/api'
import * as adminApi from '@/features/admin/api'
import type { SiteAssignment } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockAssignments: SiteAssignment[] = [
  {
    id: 1, siteId: 10, userId: 100,
    userFullName: 'Martin Pierre',
    userAvatarUrl: null,
    startDatetime: null, endDatetime: null,
    createdAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 2, siteId: 10, userId: 101,
    userFullName: 'Dupont Jean',
    userAvatarUrl: null,
    startDatetime: '2026-04-10T08:00:00Z',
    endDatetime: '2026-04-10T12:00:00Z',
    createdAt: '2026-04-01T08:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sitesApi.getAssignmentPresets).mockResolvedValue([])
  vi.mocked(adminApi.getUsers).mockResolvedValue([])
})

describe('ChantierEquipe', () => {
  it('affiche la liste des ouvriers attribués', async () => {
    vi.mocked(sitesApi.getSiteAssignments).mockResolvedValue(mockAssignments)

    renderWithProviders(<ChantierEquipe siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    expect(screen.getByText('Toute la durée')).toBeInTheDocument()
  })

  it('affiche un message quand aucun ouvrier attribué', async () => {
    vi.mocked(sitesApi.getSiteAssignments).mockResolvedValue([])

    renderWithProviders(<ChantierEquipe siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" />)

    await waitFor(() => {
      expect(screen.getByText('Aucun ouvrier attribué')).toBeInTheDocument()
    })
  })

  it('affiche le bouton Attribuer l\'équipe', async () => {
    vi.mocked(sitesApi.getSiteAssignments).mockResolvedValue([])

    renderWithProviders(<ChantierEquipe siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /attribuer l'équipe/i })).toBeInTheDocument()
    })
  })

  // --- H12: Test clic sur bouton édition d'une attribution ---

  it('clic sur le bouton édition ouvre le dialog de modification', async () => {
    const user = userEvent.setup()
    vi.mocked(sitesApi.getSiteAssignments).mockResolvedValue(mockAssignments)
    vi.mocked(sitesApi.updateAssignment).mockResolvedValue(mockAssignments[1])
    vi.mocked(sitesApi.deleteAssignment).mockResolvedValue(undefined)

    renderWithProviders(<ChantierEquipe siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" />)

    await waitFor(() => {
      expect(screen.getByText('Martin Pierre')).toBeInTheDocument()
    })

    // Find the edit buttons (Edit2 icons)
    const editButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg') && !btn.textContent?.includes('Attribuer')
    )
    expect(editButtons.length).toBeGreaterThanOrEqual(1)

    // Click the first edit button
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText("Modifier l'attribution")).toBeInTheDocument()
    })
  })

  it('affiche le créneau formaté pour une attribution précise', async () => {
    vi.mocked(sitesApi.getSiteAssignments).mockResolvedValue(mockAssignments)

    renderWithProviders(<ChantierEquipe siteId={10} siteStartDate="2026-04-01" siteEndDate="2026-06-30" />)

    await waitFor(() => {
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })

    // Check that a formatted time slot is displayed for the precise assignment
    // Format is "DD/MM HH:mm-HH:mm" for same-day
    expect(screen.getByText(/10\/04/)).toBeInTheDocument()
  })
})
