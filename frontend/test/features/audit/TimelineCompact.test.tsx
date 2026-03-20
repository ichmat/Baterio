import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimelineCompact } from '@/features/audit/TimelineCompact'
import * as auditApi from '@/features/audit/api'
import type { AuditEventsPage } from '@/features/audit/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/audit/api')

const mockEventsPage: AuditEventsPage = {
  data: [
    { id: 1, entityType: 'Customer', entityId: 1, userId: 1, userFullName: 'Sophie Martin', action: 'Created', payload: null, createdAt: '2026-03-15T10:00:00Z' },
    { id: 2, entityType: 'Customer', entityId: 1, userId: 1, userFullName: 'Sophie Martin', action: 'Updated', payload: '{"changes":{"telephone":{"old":"0600","new":"0601"}}}', createdAt: '2026-03-16T14:30:00Z' },
    { id: 3, entityType: 'Customer', entityId: 1, userId: 2, userFullName: 'Marc Durand', action: 'Updated', payload: '{"changes":{"email":{"old":"a@b.fr","new":"c@d.fr"}}}', createdAt: '2026-03-17T09:00:00Z' },
  ],
  pagination: { page: 1, pageSize: 5, totalItems: 3, totalPages: 1 },
}

const emptyPage: AuditEventsPage = {
  data: [],
  pagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TimelineCompact', () => {
  it('affiche les événements d\'audit avec action, auteur, date', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockEventsPage)
    renderWithProviders(<TimelineCompact entityType="Customer" entityId={1} onViewDetails={() => {}} />)

    await waitFor(() => {
      expect(screen.getAllByText(/Sophie Martin/).length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByText(/Marc Durand/)).toBeInTheDocument()
  })

  it('affiche un maximum de 5 événements', async () => {
    const fiveEvents: AuditEventsPage = {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        entityType: 'Customer',
        entityId: 1,
        userId: 1,
        userFullName: `User ${i}`,
        action: 'Updated',
        payload: null,
        createdAt: '2026-03-15T10:00:00Z',
      })),
      pagination: { page: 1, pageSize: 5, totalItems: 10, totalPages: 2 },
    }
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(fiveEvents)
    renderWithProviders(<TimelineCompact entityType="Customer" entityId={1} onViewDetails={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/User 0/)).toBeInTheDocument()
    })
    // Verify API was called with pageSize=5
    expect(auditApi.getAuditEvents).toHaveBeenCalledWith('Customer', 1, 1, 5, undefined)
    // Verify exactly 5 event items rendered in DOM
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(new RegExp(`User ${i}`))).toBeInTheDocument()
    }
  })

  it('affiche "Aucun historique" quand la liste est vide', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(emptyPage)
    renderWithProviders(<TimelineCompact entityType="Customer" entityId={1} onViewDetails={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Aucun historique')).toBeInTheDocument()
    })
  })

  it('affiche le bouton "Voir les détails"', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockEventsPage)
    renderWithProviders(<TimelineCompact entityType="Customer" entityId={1} onViewDetails={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Voir les détails →')).toBeInTheDocument()
    })
  })

  it('appelle onViewDetails quand le bouton est cliqué', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockEventsPage)
    const onViewDetails = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<TimelineCompact entityType="Customer" entityId={1} onViewDetails={onViewDetails} />)

    await waitFor(() => {
      expect(screen.getByText('Voir les détails →')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Voir les détails →'))
    expect(onViewDetails).toHaveBeenCalledOnce()
  })

  it('affiche un skeleton pendant le chargement', () => {
    vi.mocked(auditApi.getAuditEvents).mockImplementation(() => new Promise(() => {}))
    const { container } = renderWithProviders(
      <TimelineCompact entityType="Customer" entityId={1} onViewDetails={() => {}} />,
    )

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
