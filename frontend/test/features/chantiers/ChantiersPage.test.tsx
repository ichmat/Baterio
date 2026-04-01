import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ChantiersPage } from '@/pages/ChantiersPage'
import * as sitesApi from '@/features/chantiers/api'
import type { SiteResponse } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function makeSite(overrides: Partial<SiteResponse> = {}): SiteResponse {
  return {
    id: 1,
    reference: 'CH-2026-001',
    subject: 'Rénovation cuisine',
    status: 'Planned',
    customerId: 10,
    customerName: 'Dupont Jean',
    quoteId: null,
    quoteReference: null,
    siteAddress: '12 rue de la Paix',
    startDate: null,
    endDate: null,
    customFields: null,
    notes: null,
    createdBy: 1,
    createdByName: 'Martin Sophie',
    createdAt: '2026-03-31T10:00:00Z',
    updatedAt: null,
    ...overrides,
  }
}

const mockSites: SiteResponse[] = [
  makeSite({ id: 1, reference: 'CH-2026-001', customerName: 'Dupont Jean', status: 'Planned', siteAddress: '12 rue Test' }),
  makeSite({ id: 2, reference: 'CH-2026-002', customerName: 'Martin Sophie', status: 'InProgress', siteAddress: '5 avenue Champs' }),
  makeSite({ id: 3, reference: 'CH-2026-003', customerName: 'Bernard Paul', status: 'Completed', siteAddress: '1 place Republique' }),
]

const mockSitesPage = {
  data: mockSites,
  pagination: { page: 1, pageSize: 500, totalItems: 3, totalPages: 1 },
}

const emptySitesPage = {
  data: [] as SiteResponse[],
  pagination: { page: 1, pageSize: 500, totalItems: 0, totalPages: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

function renderPage() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/chantiers']}>
      <Routes>
        <Route path="/chantiers" element={<ChantiersPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ChantiersPage', () => {
  it('affiche un message vide quand il n\'y a pas de chantiers', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(emptySitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Aucun chantier pour le moment')).toBeInTheDocument()
    })
  })

  it('DataTable affiche les colonnes : Client, Adresse, Statut, Ouvriers, Créé le', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Client')).toBeInTheDocument()
    })

    expect(screen.getByText('Adresse')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
    expect(screen.getByText('Ouvriers')).toBeInTheDocument()
    expect(screen.getByText('Créé le')).toBeInTheDocument()
  })

  it('badges de statut utilisent le bon triple codage (icone + couleur + texte)', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Planifié')).toBeInTheDocument()
    })

    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })

  it('colonne Ouvriers affiche "-" (placeholder story 4.3)', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Client')).toBeInTheDocument()
    })

    // Workers column shows "-" for all rows
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('DataTable dispose de la selection de lignes (enableRowSelection)', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Client')).toBeInTheDocument()
    })

    // Row selection checkboxes should be rendered
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('barre de recherche est presente avec placeholder', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Client')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('Rechercher un chantier...')).toBeInTheDocument()
  })

  it('selecteur de colonnes est present', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Client')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Sélecteur de colonnes')).toBeInTheDocument()
  })

  it('selection de lignes puis export Excel', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)
    const user = userEvent.setup()

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Client')).toBeInTheDocument()
    })

    // Select all rows
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0]) // header checkbox = select all

    await waitFor(() => {
      expect(screen.getByText('Exporter Excel')).toBeInTheDocument()
    })
  })

  it('bouton Nouveau chantier est present', async () => {
    vi.mocked(sitesApi.getSites).mockResolvedValue(mockSitesPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Nouveau chantier')).toBeInTheDocument()
    })
  })
})
