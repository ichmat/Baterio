import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ChantierDetailPage } from '@/features/chantiers/ChantierDetailPage'
import * as sitesApi from '@/features/chantiers/api'
import type { SiteResponse } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')

const mockSite: SiteResponse = {
  id: 1,
  reference: 'CH-2026-001',
  subject: 'Rénovation cuisine',
  status: 'Planned',
  customerId: 10,
  customerName: 'Dupont Jean',
  quoteId: 5,
  quoteReference: 'DEV-2026-005',
  siteAddress: '12 rue de la Paix, 75002 Paris',
  startDate: '2026-04-01',
  endDate: '2026-06-30',
  customFields: null,
  notes: 'Notes de test',
  createdBy: 1,
  createdByName: 'Martin Sophie',
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: null,
}

const mockSiteWithoutQuote: SiteResponse = {
  ...mockSite,
  id: 2,
  quoteId: null,
  quoteReference: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

function renderPage(siteId = '1') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/chantiers/${siteId}`]}>
      <Routes>
        <Route path="/chantiers/:id" element={<ChantierDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ChantierDetailPage', () => {
  it('affiche les données du chantier (reference, objet, statut, client, adresse)', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Rénovation cuisine')).toBeInTheDocument()
    expect(screen.getByText('Planifié')).toBeInTheDocument()
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    expect(screen.getByText('12 rue de la Paix, 75002 Paris')).toBeInTheDocument()
  })

  it('EntityLinksBar avec devis (quoteId present) — 2 liens', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Voir le client')).toBeInTheDocument()
    expect(screen.getByText('Voir le devis')).toBeInTheDocument()
  })

  it('EntityLinksBar sans devis (quoteId null) — 1 lien (client seulement)', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSiteWithoutQuote)

    renderPage('2')

    await waitFor(() => {
      expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Voir le client')).toBeInTheDocument()
    expect(screen.queryByText('Voir le devis')).not.toBeInTheDocument()
  })

  it('affiche les notes si présentes', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Notes de test')).toBeInTheDocument()
    })
  })

  it('affiche le devis lié si présent', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('DEV-2026-005')).toBeInTheDocument()
    })
  })

  it('affiche "Chantier introuvable" si le site n\'existe pas', async () => {
    vi.mocked(sitesApi.getSiteById).mockRejectedValue(new Error('Not found'))

    renderPage('999')

    await waitFor(() => {
      expect(screen.getByText('Chantier introuvable')).toBeInTheDocument()
    })
  })
})
