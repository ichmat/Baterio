import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GlobalSearch } from '@/features/search/GlobalSearch'
import * as api from '@/features/clients/api'
import * as devisApi from '@/features/devis/api'
import type { CustomerSearchResult } from '@/features/clients/types'
import type { QuoteSearchResult } from '@/features/devis/types'
import { renderWithProviders } from '../../test-utils'
import type { ReactNode } from 'react'

vi.mock('@/features/clients/api')
vi.mock('@/features/devis/api')

const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Command components to avoid cmdk issues in happy-dom
vi.mock('@/components/ui/command', () => ({
  CommandDialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; title?: string; description?: string; children: ReactNode }) => {
    if (!open) return null
    return (
      <div data-testid="command-dialog" onKeyDown={(e) => { if (e.key === 'Escape') onOpenChange(false) }}>
        {children}
      </div>
    )
  },
  CommandInput: ({ placeholder, value, onValueChange }: { placeholder?: string; value?: string; onValueChange?: (value: string) => void }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ heading, children }: { heading?: string; children: ReactNode }) => (
    <div>
      {heading && <div>{heading}</div>}
      {children}
    </div>
  ),
  CommandItem: ({ children, onSelect }: { children: ReactNode; value?: string; onSelect?: () => void }) => (
    <div role="option" tabIndex={0} onClick={() => onSelect?.()} onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.() }}>{children}</div>
  ),
}))

const mockResults: CustomerSearchResult[] = [
  { id: 1, lastName: 'Lefebvre', firstName: 'Marie', telephone: '0601020304', email: null, quoteCount: 0, siteCount: 0 },
  { id: 2, lastName: 'Lefranc', firstName: 'Pierre', telephone: null, email: 'pierre@test.fr', quoteCount: 0, siteCount: 0 },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GlobalSearch', () => {
  it('opens on Ctrl+K', async () => {
    const onOpenChange = vi.fn()
    renderWithProviders(<GlobalSearch open={false} onOpenChange={onOpenChange} />)

    await userEvent.keyboard('{Control>}k{/Control}')

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('displays search results grouped under "Clients"', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue(mockResults)
    const onOpenChange = vi.fn()
    renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

    const input = screen.getByPlaceholderText('Rechercher...')
    await userEvent.type(input, 'Lef')

    await waitFor(() => {
      expect(screen.getByText('Clients')).toBeInTheDocument()
      expect(screen.getByText('Lefebvre Marie')).toBeInTheDocument()
      expect(screen.getByText('Lefranc Pierre')).toBeInTheDocument()
    })
  })

  it('navigates to client page when result is selected', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue(mockResults)
    const onOpenChange = vi.fn()
    renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

    const input = screen.getByPlaceholderText('Rechercher...')
    await userEvent.type(input, 'Lef')

    await waitFor(() => {
      expect(screen.getByText('Lefebvre Marie')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Lefebvre Marie'))

    expect(mockNavigate).toHaveBeenCalledWith('/clients/1')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

    const dialog = screen.getByTestId('command-dialog')
    dialog.focus()
    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('navigates via Enter key on focused result', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue(mockResults)
    const onOpenChange = vi.fn()
    renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

    const input = screen.getByPlaceholderText('Rechercher...')
    await userEvent.type(input, 'Lef')

    await waitFor(() => {
      expect(screen.getByText('Lefebvre Marie')).toBeInTheDocument()
    })

    const firstResult = screen.getByText('Lefebvre Marie').closest('[role="option"]')!
    firstResult.focus()
    await userEvent.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenCalledWith('/clients/1')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows "Aucun résultat" when no matches', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue([])
    vi.mocked(devisApi.searchQuotes).mockResolvedValue([])
    const onOpenChange = vi.fn()
    renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

    const input = screen.getByPlaceholderText('Rechercher...')
    await userEvent.type(input, 'Xyz')

    await waitFor(() => {
      expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
    })
  })

  // --- Task 16: Tests GlobalSearch Devis ---

  describe('Catégorie Devis', () => {
    const mockQuoteResults: QuoteSearchResult[] = [
      {
        id: 10,
        reference: 'DEV-2026-001',
        subject: 'Rénovation toiture',
        status: 'Draft',
        priority: 'High',
        customerName: 'Dupont Jean',
        createdAt: '2026-03-01T10:00:00Z',
      },
      {
        id: 11,
        reference: 'DEV-2026-002',
        subject: 'Isolation combles',
        status: 'Sent',
        priority: 'Normal',
        customerName: 'Martin Marie',
        createdAt: '2026-03-02T10:00:00Z',
      },
    ]

    it('affiche la catégorie "Devis" avec résultats', async () => {
      vi.mocked(api.searchCustomers).mockResolvedValue([])
      vi.mocked(devisApi.searchQuotes).mockResolvedValue(mockQuoteResults)
      const onOpenChange = vi.fn()
      renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

      const input = screen.getByPlaceholderText('Rechercher...')
      await userEvent.type(input, 'toiture')

      await waitFor(() => {
        expect(screen.getByText('Devis')).toBeInTheDocument()
      })
      expect(screen.getByText('DEV-2026-001')).toBeInTheDocument()
      expect(screen.getByText('DEV-2026-002')).toBeInTheDocument()
    })

    it('clic sur un devis navigue vers /devis/:id', async () => {
      vi.mocked(api.searchCustomers).mockResolvedValue([])
      vi.mocked(devisApi.searchQuotes).mockResolvedValue(mockQuoteResults)
      const onOpenChange = vi.fn()
      renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

      const input = screen.getByPlaceholderText('Rechercher...')
      await userEvent.type(input, 'toiture')

      await waitFor(() => {
        expect(screen.getByText('DEV-2026-001')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText('DEV-2026-001'))

      expect(mockNavigate).toHaveBeenCalledWith('/devis/10')
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('badge statut visible dans les résultats', async () => {
      vi.mocked(api.searchCustomers).mockResolvedValue([])
      vi.mocked(devisApi.searchQuotes).mockResolvedValue(mockQuoteResults)
      const onOpenChange = vi.fn()
      renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

      const input = screen.getByPlaceholderText('Rechercher...')
      await userEvent.type(input, 'toiture')

      await waitFor(() => {
        expect(screen.getByText('Brouillon')).toBeInTheDocument()
        expect(screen.getByText('Envoyé')).toBeInTheDocument()
      })
    })

    it('terme < 2 chars → pas de catégorie Devis', async () => {
      vi.mocked(api.searchCustomers).mockResolvedValue([])
      vi.mocked(devisApi.searchQuotes).mockResolvedValue([])
      const onOpenChange = vi.fn()
      renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

      const input = screen.getByPlaceholderText('Rechercher...')
      await userEvent.type(input, 'a')

      // Query is only 1 char — search not triggered, no Devis category
      expect(screen.queryByText('Devis')).not.toBeInTheDocument()
    })

    it('icône FileText présente dans les résultats devis', async () => {
      vi.mocked(api.searchCustomers).mockResolvedValue([])
      vi.mocked(devisApi.searchQuotes).mockResolvedValue(mockQuoteResults)
      const onOpenChange = vi.fn()
      renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

      const input = screen.getByPlaceholderText('Rechercher...')
      await userEvent.type(input, 'toiture')

      await waitFor(() => {
        expect(screen.getByText('DEV-2026-001')).toBeInTheDocument()
      })

      // FileText icon rendered as SVG — lucide-react renders <svg> elements
      const devisGroup = screen.getByText('Devis').parentElement!
      const svgs = devisGroup.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(2) // one FileText per result
    })

    it('pas de groupe "Devis" quand la recherche retourne un tableau vide', async () => {
      vi.mocked(api.searchCustomers).mockResolvedValue([])
      vi.mocked(devisApi.searchQuotes).mockResolvedValue([])
      const onOpenChange = vi.fn()
      renderWithProviders(<GlobalSearch open={true} onOpenChange={onOpenChange} />)

      const input = screen.getByPlaceholderText('Rechercher...')
      await userEvent.type(input, 'xyz')

      await waitFor(() => {
        expect(screen.getByText('Aucun résultat')).toBeInTheDocument()
      })
      expect(screen.queryByText('Devis')).not.toBeInTheDocument()
    })
  })
})
