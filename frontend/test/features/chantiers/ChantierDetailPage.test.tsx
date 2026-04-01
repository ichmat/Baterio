import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ChantierDetailPage } from '@/features/chantiers/ChantierDetailPage'
import * as sitesApi from '@/features/chantiers/api'
import * as filesApi from '@/features/files/api'
import * as commentsApi from '@/features/comments/api'
import * as auditApi from '@/features/audit/api'
import * as adminApi from '@/features/admin/api'
import type { SiteResponse } from '@/features/chantiers/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/chantiers/api')
vi.mock('@/features/files/api')
vi.mock('@/features/comments/api')
vi.mock('@/features/audit/api')
vi.mock('@/features/admin/api')
vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

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

const emptyCommentsPage = {
  data: [],
  pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
}

const emptyAuditPage = {
  data: [],
  pagination: { page: 1, pageSize: 5, totalItems: 0, totalPages: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(filesApi.getAttachments).mockResolvedValue([])
  vi.mocked(commentsApi.getComments).mockResolvedValue(emptyCommentsPage)
  vi.mocked(auditApi.getAuditEvents).mockResolvedValue(emptyAuditPage)
  vi.mocked(adminApi.getCustomFields).mockResolvedValue([])
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
    // "Planifié" appears in both the badge and the pipeline step
    expect(screen.getAllByText('Planifié').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    expect(screen.getByText('12 rue de la Paix, 75002 Paris')).toBeInTheDocument()
  })

  it('StatusPipeline affiche les 4 étapes avec état actuel', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
    })

    // The pipeline should show all 4 steps
    expect(screen.getAllByText('Planifié').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Pause')).toBeInTheDocument()
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })

  it('SiteStatusActions affiche le bouton Démarrer pour statut Planned', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Démarrer')).toBeInTheDocument()
    })
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

  it('EntityLinksBar sans devis (quoteId null) — 1 lien', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue({ ...mockSite, id: 2, quoteId: null, quoteReference: null })

    renderPage('2')

    await waitFor(() => {
      expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Voir le client')).toBeInTheDocument()
    expect(screen.queryByText('Voir le devis')).not.toBeInTheDocument()
  })

  it('CommentSection est rendu avec entityType="Site"', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Commentaires')).toBeInTheDocument()
    })
  })

  it('FileUploadZone est rendu avec entityType="Site"', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Pièces jointes')).toBeInTheDocument()
    })
  })

  it('TimelineCompact est rendu avec titre Historique', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('CH-2026-001')).toBeInTheDocument()
    })

    // TimelineCompact renders the Historique card
    expect(screen.getByText('Historique')).toBeInTheDocument()
  })

  it('bouton Modifier ouvre le sheet d\'édition', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Modifier'))

    await waitFor(() => {
      expect(screen.getByText('Modifier le chantier')).toBeInTheDocument()
    })
  })

  it('affiche "Chantier introuvable" si le site n\'existe pas', async () => {
    vi.mocked(sitesApi.getSiteById).mockRejectedValue(new Error('Not found'))

    renderPage('999')

    await waitFor(() => {
      expect(screen.getByText('Chantier introuvable')).toBeInTheDocument()
    })
  })

  it('clic Supprimer ouvre le dialog de confirmation', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Supprimer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Supprimer'))

    await waitFor(() => {
      expect(screen.getByText(/Supprimer le chantier CH-2026-001/)).toBeInTheDocument()
    })
  })

  it('confirmation suppression appelle deleteSite + toast', async () => {
    vi.mocked(sitesApi.getSiteById).mockResolvedValue(mockSite)
    vi.mocked(sitesApi.deleteSite).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Supprimer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Supprimer'))

    await waitFor(() => {
      expect(screen.getByText(/Supprimer le chantier/)).toBeInTheDocument()
    })

    const buttons = screen.getAllByText('Supprimer')
    await user.click(buttons[buttons.length - 1])

    await waitFor(() => {
      expect(sitesApi.deleteSite).toHaveBeenCalledWith(1)
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Chantier supprimé')
  })
})
