import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router'
import { ClientsPage } from '@/features/clients/ClientsPage'
import * as api from '@/features/clients/api'
import type { CustomerResponse } from '@/features/clients/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/clients/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock DataTable to avoid @tanstack/react-table resolution issues in happy-dom
vi.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data, onRowClick }: { data: CustomerResponse[]; columns: unknown[]; onRowClick?: (row: CustomerResponse) => void; searchPlaceholder?: string; searchColumn?: string }) => (
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
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
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

const mockCustomers: CustomerResponse[] = [
  { id: 1, lastName: 'Dupont', firstName: 'Jean', telephone: '0601020304', email: 'jean@dupont.fr', address: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: null },
  { id: 2, lastName: 'Martin', firstName: 'Marie', telephone: null, email: null, address: null, createdAt: '2026-01-02T00:00:00Z', updatedAt: null },
]

beforeEach(() => {
  vi.clearAllMocks()
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
})
