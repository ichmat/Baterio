import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { DevisPage } from '@/features/devis/DevisPage'
import * as api from '@/features/devis/api'
import type { QuoteListResponse } from '@/features/devis/types'
import { renderWithProviders } from '../../test-utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'

vi.mock('@/features/devis/api')
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}))

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock DataTable — realistic: onExport receives selectedRows from the caller
vi.mock('@/components/ui/data-table', () => ({
  DataTable: ({
    data,
    onRowClick,
    selectedRowId,
    showColumnSelector,
    enableRowSelection,
    onExport,
  }: {
    data: QuoteListResponse[]
    columns: unknown[]
    onRowClick?: (row: QuoteListResponse) => void
    selectedRowId?: number
    showColumnSelector?: boolean
    enableRowSelection?: boolean
    onExport?: (rows: QuoteListResponse[]) => void
    columnVisibility?: Record<string, boolean>
    onColumnVisibilityChange?: (v: Record<string, boolean>) => void
  }) => (
    <table data-testid="data-table">
      <thead>
        <tr>
          <th>Client</th>
          <th>Objet</th>
          <th>Statut</th>
          <th>Priorité</th>
          <th>Créé le</th>
          <th>Relance</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            data-selected={row.id === selectedRowId ? 'true' : undefined}
          >
            <td>{row.customerName}</td>
            <td>{row.subject}</td>
            <td>{row.status}</td>
            <td>{row.priority}</td>
            <td>{row.createdAt}</td>
            <td>{row.reminderDate ?? '—'}</td>
          </tr>
        ))}
      </tbody>
      {showColumnSelector && <tfoot data-testid="column-selector" />}
      {enableRowSelection && <tfoot data-testid="row-selection" />}
      {onExport && (
        <tfoot data-testid="export-btn">
          <tr>
            <td>
              <button onClick={() => onExport([data[0]])}>Exporter Excel</button>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  ),
}))

// Mock resizable components
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock DevisDetailPage in split view
vi.mock('@/features/devis/DevisDetailPage', () => ({
  DevisDetailPage: ({ quoteId, showBackButton }: { quoteId?: number; showBackButton?: boolean }) => (
    <div data-testid="devis-detail">
      <span>Detail-{quoteId}</span>
      {showBackButton !== false && <button>Retour aux devis</button>}
    </div>
  ),
}))

// Mock export-xlsx
vi.mock('@/lib/export-xlsx', () => ({
  exportToXlsx: vi.fn(),
}))

// Mock comments, files, audit
vi.mock('@/features/comments/api', () => ({
  getComments: vi.fn().mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } }),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
}))
vi.mock('@/features/files/api', () => ({
  getAttachments: vi.fn().mockResolvedValue([]),
  uploadFile: vi.fn(),
  deleteAttachment: vi.fn(),
  downloadFileBlob: vi.fn(),
}))
vi.mock('@/features/audit/api', () => ({
  getAuditEvents: vi.fn().mockResolvedValue({
    data: [],
    pagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
  }),
}))

const mockQuotes: QuoteListResponse[] = [
  {
    id: 1,
    reference: 'DEV-2026-001',
    subject: 'Rénovation toiture',
    status: 'Draft',
    priority: 'High',
    customerName: 'Dupont Jean',
    amountExclTax: 1500,
    amountInclTax: 1800,
    reminderDate: null,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 2,
    reference: 'DEV-2026-002',
    subject: 'Isolation combles',
    status: 'Sent',
    priority: 'Normal',
    customerName: 'Martin Marie',
    amountExclTax: 2000,
    amountInclTax: 2400,
    reminderDate: '2026-04-01',
    createdAt: '2026-03-02T10:00:00Z',
  },
]

const mockQuotesPage = {
  data: mockQuotes,
  pagination: { page: 1, pageSize: 500, totalItems: 2, totalPages: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useMediaQuery).mockReturnValue(false)
  localStorage.clear()
})

function renderPage() {
  return renderWithProviders(
    <BrowserRouter>
      <DevisPage />
    </BrowserRouter>,
  )
}

describe('DevisPage', () => {
  it('DataTable affichée avec colonnes correctes', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument()
    })
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Objet')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
    expect(screen.getByText('Priorité')).toBeInTheDocument()
    expect(screen.getByText('Créé le')).toBeInTheDocument()
    expect(screen.getByText('Relance')).toBeInTheDocument()
  })

  it('affiche les données des devis', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    })
    expect(screen.getByText('Rénovation toiture')).toBeInTheDocument()
    expect(screen.getByText('Martin Marie')).toBeInTheDocument()
    expect(screen.getByText('Isolation combles')).toBeInTheDocument()
  })

  it('Skeleton en chargement', () => {
    vi.mocked(api.getQuotes).mockImplementation(() => new Promise(() => {}))
    renderPage()

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('état vide — message et bouton Nouveau devis', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 500, totalItems: 0, totalPages: 0 },
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Aucun devis pour le moment')).toBeInTheDocument()
    })
    expect(screen.getByText('Nouveau devis')).toBeInTheDocument()
  })

  it('sélecteur de colonnes activé', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('column-selector')).toBeInTheDocument()
    })
  })

  it('multi-selection activée', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('row-selection')).toBeInTheDocument()
    })
  })

  it('bouton export présent', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('export-btn')).toBeInTheDocument()
    })
  })

  it('clic export appelle exportToXlsx avec colonnes et données', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    const { exportToXlsx } = await import('@/lib/export-xlsx')
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Exporter Excel')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Exporter Excel'))

    expect(exportToXlsx).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 1 })]),
      expect.arrayContaining([expect.objectContaining({ key: expect.any(String), header: expect.any(String) })]),
      expect.stringContaining('devis-export-'),
    )
  })

  describe('Desktop — Split View', () => {
    beforeEach(() => {
      vi.mocked(useMediaQuery).mockReturnValue(true)
    })

    it('clic sur un devis affiche le panneau détail', async () => {
      vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont Jean'))

      await waitFor(() => {
        expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
      })
      expect(screen.getByText('Detail-1')).toBeInTheDocument()
    })

    it('showBackButton={false} — pas de bouton retour dans le panneau Split View', async () => {
      vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont Jean'))

      await waitFor(() => {
        expect(screen.getByTestId('devis-detail')).toBeInTheDocument()
      })
      expect(screen.queryByText('Retour aux devis')).not.toBeInTheDocument()
    })

    it('Escape ferme le panneau Split View', async () => {
      vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont Jean'))

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
    it('clic sur un devis navigue vers /devis/:id', async () => {
      vi.mocked(useMediaQuery).mockReturnValue(false)
      vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Dupont Jean'))

      expect(mockNavigate).toHaveBeenCalledWith('/devis/1')
      expect(screen.queryByTestId('resizable-group')).not.toBeInTheDocument()
    })
  })

  it('charge tous les devis (pageSize 500)', async () => {
    vi.mocked(api.getQuotes).mockResolvedValue(mockQuotesPage)
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toBeInTheDocument()
    })
    expect(api.getQuotes).toHaveBeenCalledWith(1, 500)
  })
})
