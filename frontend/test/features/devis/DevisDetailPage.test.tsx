import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { DevisDetailPage } from '@/features/devis/DevisDetailPage'
import * as devisApi from '@/features/devis/api'
import * as adminApi from '@/features/admin/api'
import type { QuoteResponse } from '@/features/devis/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/devis/api')
vi.mock('@/features/admin/api')
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
    data: [
      { id: 1, entityType: 'Quote', entityId: 1, userId: 1, userFullName: 'Sophie Martin', action: 'Created', payload: null, createdAt: '2026-03-19T10:00:00Z' },
    ],
    pagination: { page: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock CustomerAutocomplete
vi.mock('@/features/clients/CustomerAutocomplete', () => ({
  CustomerAutocomplete: () => <div data-testid="customer-autocomplete" />,
}))
vi.mock('@/features/clients/CreateClientDialog', () => ({
  CreateClientDialog: () => null,
}))

const mockQuote: QuoteResponse = {
  id: 1,
  reference: 'DEV-2026-0001',
  subject: 'Rénovation cuisine',
  status: 'Draft',
  priority: 'Normal',
  customerId: 10,
  customerName: 'Dupont Jean',
  validityDate: '2026-04-19',
  estimatedDuration: '3 semaines',
  siteAddress: '1 rue de Paris',
  amountExclTax: 1500,
  taxRate: 20,
  amountInclTax: 1800,
  reminderDate: null,
  customFields: null,
  legalMentions: 'Mentions légales de test',
  notes: 'Notes de test',
  createdBy: 1,
  createdByName: 'Martin Sophie',
  createdAt: '2026-03-19T10:00:00Z',
  updatedAt: null,
  lines: [
    { id: 1, description: 'Peinture', quantity: 2, unitPriceExclTax: 500, lineTotalExclTax: 1000, displayOrder: 0 },
    { id: 2, description: 'Carrelage', quantity: 1, unitPriceExclTax: 500, lineTotalExclTax: 500, displayOrder: 1 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminApi.getCustomFields).mockResolvedValue([])
})

function renderPage(quoteId = '1') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/devis/${quoteId}`]}>
      <Routes>
        <Route path="/devis/:id" element={<DevisDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DevisDetailPage', () => {
  it('affiche les informations du devis', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('DEV-2026-0001')).toBeInTheDocument()
    })
    expect(screen.getByText('Rénovation cuisine')).toBeInTheDocument()
    expect(screen.getAllByText('Brouillon').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
  })

  it('affiche les lignes dans une table', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Peinture')).toBeInTheDocument()
    })
    expect(screen.getByText('Carrelage')).toBeInTheDocument()
  })

  it('affiche les mentions légales', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Mentions légales de test')).toBeInTheDocument()
    })
  })

  it('affiche le message guide si mentions légales vides', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue({
      ...mockQuote,
      legalMentions: null,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/informations légales/)).toBeInTheDocument()
    })
  })

  it('EntityLinksBar "Voir le client"', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Voir le client')).toBeInTheDocument()
    })
    expect(screen.getByText('Voir le client').closest('a')).toHaveAttribute('href', '/clients/10')
  })

  it('bouton "Modifier" présent', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument()
    })
  })

  it('skeleton pendant le chargement', () => {
    vi.mocked(devisApi.getQuoteById).mockReturnValue(new Promise(() => {}))
    renderPage()

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('devis inexistant → message d\'erreur', async () => {
    vi.mocked(devisApi.getQuoteById).mockRejectedValue(new Error('Not found'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Devis introuvable')).toBeInTheDocument()
    })
    expect(screen.getByText('Retour aux devis')).toBeInTheDocument()
  })

  it('bouton Modifier bascule en mode édition', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Modifier')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Modifier'))

    await waitFor(() => {
      expect(screen.getByText(/Modifier le devis DEV-2026-0001/)).toBeInTheDocument()
    })
  })

  it('StatusPipeline affiché avec le statut courant', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Brouillon')
  })

  it('StatusActions — bouton "Envoyer" visible pour Draft', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Envoyer')).toBeInTheDocument()
    })
  })

  it('bouton "Créer le chantier" visible et cliquable si Accepted sans siteId', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue({
      ...mockQuote,
      status: 'Accepted',
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Créer le chantier')).toBeInTheDocument()
    })
    expect(screen.getByText('Créer le chantier').closest('button')).not.toBeDisabled()
  })

  it('bouton "Créer le chantier" non visible pour Draft', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('DEV-2026-0001')).toBeInTheDocument()
    })
    expect(screen.queryByText('Créer le chantier')).not.toBeInTheDocument()
  })

  it('bouton "Créer le chantier" non visible pour Sent', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue({ ...mockQuote, status: 'Sent' })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('DEV-2026-0001')).toBeInTheDocument()
    })
    expect(screen.queryByText('Créer le chantier')).not.toBeInTheDocument()
  })

  it('bouton "Créer le chantier" non visible pour Refused', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue({ ...mockQuote, status: 'Refused' })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('DEV-2026-0001')).toBeInTheDocument()
    })
    expect(screen.queryByText('Créer le chantier')).not.toBeInTheDocument()
  })

  it('QuickEditReminderDate — "Ajouter une relance" visible', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Ajouter une relance')).toBeInTheDocument()
    })
  })

  it('CommentSection et FileUploadZone présents', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Commentaires')).toBeInTheDocument()
    })
    expect(screen.getByText('Pièces jointes')).toBeInTheDocument()
  })

  it('bouton Galerie médias masqué si aucune PJ', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('DEV-2026-0001')).toBeInTheDocument()
    })
    expect(screen.queryByText('Galerie médias')).not.toBeInTheDocument()
  })

  it('TimelineCompact présent dans la fiche devis', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Historique')).toBeInTheDocument()
    })
  })

  it('bouton "Voir les détails" ouvre TimelineFull', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Voir les détails →')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Voir les détails →'))

    await waitFor(() => {
      expect(screen.getByText(/Historique —/)).toBeInTheDocument()
    })
  })

  it('bouton Galerie médias visible si PJ existent', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    const filesApi = await import('@/features/files/api')
    vi.mocked(filesApi.getAttachments).mockResolvedValue([
      {
        id: 1, entityType: 'Quote', entityId: 1,
        filename: 'photo.jpg', contentType: 'image/jpeg',
        size: 100, uploadedBy: 1, uploadedByName: 'Test', createdAt: new Date().toISOString(),
      },
    ])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Galerie médias')).toBeInTheDocument()
    })
  })

  it('bouton Supprimer présent', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Supprimer')).toBeInTheDocument()
    })
  })

  it('clic Supprimer ouvre le dialog de confirmation', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Supprimer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Supprimer'))

    await waitFor(() => {
      expect(screen.getByText(/Supprimer le devis DEV-2026-0001/)).toBeInTheDocument()
    })
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('confirmation suppression appelle deleteQuote + toast', async () => {
    vi.mocked(devisApi.getQuoteById).mockResolvedValue(mockQuote)
    vi.mocked(devisApi.deleteQuote).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Supprimer')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Supprimer'))

    await waitFor(() => {
      expect(screen.getByText(/Supprimer le devis/)).toBeInTheDocument()
    })

    const buttons = screen.getAllByText('Supprimer')
    await user.click(buttons[buttons.length - 1])

    await waitFor(() => {
      expect(devisApi.deleteQuote).toHaveBeenCalledWith(1)
    })

    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('Devis supprimé')
  })
})
