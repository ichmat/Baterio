import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { ClientsPage } from '@/features/clients/ClientsPage'
import * as api from '@/features/clients/api'
import * as auditApi from '@/features/audit/api'
import type { CustomerResponse } from '@/features/clients/types'
import type { AuditEventsPage } from '@/features/audit/types'
import { renderWithProviders } from '../../test-utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'

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

// Mock DataTable to avoid @tanstack/react-table resolution issues in happy-dom
vi.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data, onRowClick, selectedRowId }: { data: CustomerResponse[]; columns: unknown[]; onRowClick?: (row: CustomerResponse) => void; searchPlaceholder?: string; selectedRowId?: number }) => (
    <table data-testid="data-table">
      <thead>
        <tr>
          <th>Nom</th>
          <th>Prénom</th>
          <th>Téléphone</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row: CustomerResponse) => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            data-selected={row.id === selectedRowId ? 'true' : undefined}
          >
            <td>{row.lastName}</td>
            <td>{row.firstName}</td>
            <td>{row.telephone || '—'}</td>
            <td>{row.email || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

// Mock ResizablePanel components
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="resizable-group">{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Sheet for TimelineFull
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

const mockCustomers: CustomerResponse[] = [
  { id: 1, lastName: 'Dupont', firstName: 'Jean', telephone: '0601020304', email: 'jean@dupont.fr', address: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: null },
  { id: 2, lastName: 'Martin', firstName: 'Marie', telephone: null, email: null, address: null, createdAt: '2026-01-02T00:00:00Z', updatedAt: null },
]

const mockAuditEvents: AuditEventsPage = {
  data: [],
  pagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useMediaQuery).mockReturnValue(false) // default: mobile
  vi.mocked(auditApi.getAuditEvents).mockResolvedValue(mockAuditEvents)
})

function renderPage() {
  return renderWithProviders(
    <BrowserRouter>
      <ClientsPage />
    </BrowserRouter>,
  )
}

describe('ClientsPage', () => {
  it('affiche la liste des clients', async () => {
    vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Dupont')).toBeInTheDocument()
    })
    expect(screen.getByText('Jean')).toBeInTheDocument()
    expect(screen.getByText('Martin')).toBeInTheDocument()
    expect(screen.getByText('Marie')).toBeInTheDocument()
    expect(screen.getByText('0601020304')).toBeInTheDocument()
    expect(screen.getByText('jean@dupont.fr')).toBeInTheDocument()
  })

  it('affiche l\'etat vide quand aucun client', async () => {
    vi.mocked(api.getCustomers).mockResolvedValue([])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Aucun client')).toBeInTheDocument()
    })
    expect(screen.getByText('Créer votre premier client')).toBeInTheDocument()
  })

  it('affiche le skeleton pendant le chargement', () => {
    vi.mocked(api.getCustomers).mockImplementation(() => new Promise(() => {}))
    renderPage()

    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })

  it('le bouton "Nouveau client" ouvre le dialog', async () => {
    vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Nouveau client')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Nouveau client'))

    await waitFor(() => {
      expect(screen.getByText('Nouveau client', { selector: '[data-slot="dialog-title"]' })).toBeInTheDocument()
    })
  })

  describe('Desktop — Split View', () => {
    beforeEach(() => {
      vi.mocked(useMediaQuery).mockReturnValue(true) // desktop
    })

    it('cliquer sur un client affiche le détail dans le panneau droit', async () => {
      vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers)
      vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomers[0])
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont'))

      await waitFor(() => {
        expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
      })
      await waitFor(() => {
        expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
      })
    })

    it('changer de client met à jour le panneau droit', async () => {
      vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers)
      vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomers[0])
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont'))

      await waitFor(() => {
        expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
      })

      vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomers[1])

      await user.click(screen.getByText('Martin'))

      await waitFor(() => {
        expect(screen.getByText('Martin Marie')).toBeInTheDocument()
      })
    })

    it('Escape ferme le panneau Split View', async () => {
      vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers)
      vi.mocked(api.getCustomerById).mockResolvedValue(mockCustomers[0])
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont'))

      await waitFor(() => {
        expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByTestId('resizable-group')).not.toBeInTheDocument()
      })
    })
  })

  describe('Mobile', () => {
    it('cliquer sur un client navigue vers /clients/:id', async () => {
      vi.mocked(useMediaQuery).mockReturnValue(false) // mobile
      vi.mocked(api.getCustomers).mockResolvedValue(mockCustomers)
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont'))

      // In mobile mode, navigate is called — verify no split view
      expect(screen.queryByTestId('resizable-group')).not.toBeInTheDocument()
    })
  })
})
