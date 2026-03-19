import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ClientDetailPage } from '@/features/clients/ClientDetailPage'
import * as api from '@/features/clients/api'
import * as auditApi from '@/features/audit/api'
import type { CustomerResponse } from '@/features/clients/types'
import type { AuditEventsPage } from '@/features/audit/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/clients/api')
vi.mock('@/features/audit/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}))

// Mock Sheet for TimelineFull
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
})

function renderPage(customerId = '1') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/clients/${customerId}`]}>
      <Routes>
        <Route path="/clients/:id" element={<ClientDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClientDetailPage', () => {
  it('affiche les informations du client', async () => {
    vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomer)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })
    expect(screen.getByText('0601020304')).toBeInTheDocument()
    expect(screen.getByText('jean@dupont.fr')).toBeInTheDocument()
    expect(screen.getByText('1 rue de Paris')).toBeInTheDocument()
    expect(screen.getByText('15/01/2026')).toBeInTheDocument()
  })

  it('le bouton "Modifier" ouvre le dialog', async () => {
    vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomer)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Modifier'))

    await waitFor(() => {
      expect(screen.getByText('Modifier le client')).toBeInTheDocument()
    })
  })

  it('affiche les sections placeholder (devis, chantiers)', async () => {
    vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomer)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Devis associés')).toBeInTheDocument()
    })
    expect(screen.getByText('Chantiers associés')).toBeInTheDocument()
    expect(screen.getByText('Aucun devis pour ce client — les devis seront disponibles prochainement')).toBeInTheDocument()
    expect(screen.getByText('Aucun chantier pour ce client — les chantiers seront disponibles prochainement')).toBeInTheDocument()
  })
})
