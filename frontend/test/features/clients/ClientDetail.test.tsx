import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ClientDetail } from '@/features/clients/ClientDetail'
import * as clientApi from '@/features/clients/api'
import * as auditApi from '@/features/audit/api'
import * as devisApi from '@/features/devis/api'
import type { CustomerResponse } from '@/features/clients/types'
import type { AuditEventsPage } from '@/features/audit/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/clients/api')
vi.mock('@/features/audit/api')
vi.mock('@/features/devis/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Sheet for TimelineFull
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

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}))

const mockCustomer: CustomerResponse = {
  id: 1,
  lastName: 'Dupont',
  firstName: 'Jean',
  telephone: '0601020304',
  email: 'jean@dupont.fr',
  address: '1 rue de Paris',
  createdAt: '2026-01-15T10:30:00Z',
  updatedAt: null,
}

const mockAuditEvents: AuditEventsPage = {
  data: [
    { id: 1, entityType: 'Customer', entityId: 1, userId: 1, userFullName: 'Sophie Martin', action: 'Created', payload: null, createdAt: '2026-01-15T10:30:00Z' },
  ],
  pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockAuditEvents)
  vi.mocked(devisApi.getQuotes).mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  })
})

function renderDetail(props: { customerId?: number; showBackButton?: boolean; onBack?: () => void } = {}) {
  return renderWithProviders(
    <MemoryRouter>
      <ClientDetail customerId={props.customerId ?? 1} showBackButton={props.showBackButton} onBack={props.onBack} />
    </MemoryRouter>,
  )
}

describe('ClientDetail', () => {
  it('affiche les informations du client', async () => {
    vi.mocked(clientApi.getCustomerById).mockResolvedValue(mockCustomer)
    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })
    expect(screen.getByText('0601020304')).toBeInTheDocument()
    expect(screen.getByText('jean@dupont.fr')).toBeInTheDocument()
    expect(screen.getByText('1 rue de Paris')).toBeInTheDocument()
  })

  it('affiche la section "Devis associés" avec état vide', async () => {
    vi.mocked(clientApi.getCustomerById).mockResolvedValue(mockCustomer)
    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Devis associés')).toBeInTheDocument()
    })
    expect(screen.getByText('Aucun devis pour ce client')).toBeInTheDocument()
  })

  it('affiche la section "Chantiers associés" avec état vide', async () => {
    vi.mocked(clientApi.getCustomerById).mockResolvedValue(mockCustomer)
    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Chantiers associés')).toBeInTheDocument()
    })
    expect(screen.getByText('Voir les chantiers')).toBeInTheDocument()
  })

  it('affiche la section historique (TimelineCompact)', async () => {
    vi.mocked(clientApi.getCustomerById).mockResolvedValue(mockCustomer)
    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Historique')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('Voir les détails →')).toBeInTheDocument()
    })
  })

  it('le bouton "Voir les détails" ouvre la TimelineFull', async () => {
    vi.mocked(clientApi.getCustomerById).mockResolvedValue(mockCustomer)
    const user = userEvent.setup()
    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('Voir les détails →')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Voir les détails →'))

    await waitFor(() => {
      expect(screen.getByText('Historique — Dupont Jean')).toBeInTheDocument()
    })
  })
})
