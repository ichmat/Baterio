import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimelineFull } from '@/features/audit/TimelineFull'
import * as auditApi from '@/features/audit/api'
import type { AuditEventsPage } from '@/features/audit/types'
import { renderWithProviders } from '../../test-utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'

vi.mock('@/features/audit/api')
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}))

// Mock Sheet to render content directly (radix portal not available in happy-dom)
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockEventsPage: AuditEventsPage = {
  data: [
    { id: 1, entityType: 'Customer', entityId: 1, userId: 1, userFullName: 'Sophie Martin', action: 'Updated', payload: '{"changes":{"telephone":{"old":"0600","new":"0601"}}}', createdAt: '2026-03-16T14:30:00Z' },
    { id: 2, entityType: 'Customer', entityId: 1, userId: 1, userFullName: 'Sophie Martin', action: 'Created', payload: null, createdAt: '2026-03-15T10:00:00Z' },
  ],
  pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
}

const emptyPage: AuditEventsPage = {
  data: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TimelineFull', () => {
  it('affiche tous les événements chronologiquement', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockEventsPage)
    renderWithProviders(
      <TimelineFull entityType="Customer" entityId={1} entityLabel="Dupont Jean" open={true} onOpenChange={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Historique — Dupont Jean')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getAllByText(/Sophie Martin/).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('affiche "Aucun événement" quand la liste est vide', async () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(emptyPage)
    renderWithProviders(
      <TimelineFull entityType="Customer" entityId={1} entityLabel="Dupont Jean" open={true} onOpenChange={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Aucun événement')).toBeInTheDocument()
    })
  })

  it('affiche un skeleton pendant le chargement', () => {
    vi.mocked(auditApi.getAuditEvents).mockImplementation(() => new Promise(() => {}))
    const { container } = renderWithProviders(
      <TimelineFull entityType="Customer" entityId={1} entityLabel="Dupont Jean" open={true} onOpenChange={() => {}} />,
    )

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('(desktop) affiche le layout alternée avec ligne centrale', async () => {
    vi.mocked(useMediaQuery).mockReturnValue(true) // desktop
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockEventsPage)
    const { container } = renderWithProviders(
      <TimelineFull entityType="Customer" entityId={1} entityLabel="Dupont Jean" open={true} onOpenChange={() => {}} />,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Sophie Martin/).length).toBeGreaterThanOrEqual(1)
    })

    // Desktop layout has alternating nodes with justify-start / justify-end
    const leftNodes = container.querySelectorAll('.justify-start')
    const rightNodes = container.querySelectorAll('.justify-end')
    expect(leftNodes.length).toBeGreaterThan(0)
    expect(rightNodes.length).toBeGreaterThan(0)
  })

  it('ne rend rien quand open=false', () => {
    vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockEventsPage)
    renderWithProviders(
      <TimelineFull entityType="Customer" entityId={1} entityLabel="Dupont Jean" open={false} onOpenChange={() => {}} />,
    )

    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
  })
})
