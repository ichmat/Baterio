import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommentSection } from '@/features/devis/CommentSection'
import * as commentsApi from '@/features/comments/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/comments/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const emptyPage = {
  data: [],
  pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
}

const commentsPage = {
  data: [
    {
      id: 1,
      entityType: 'Quote',
      entityId: 1,
      userId: 1,
      userFullName: 'Martin Sophie',
      content: 'Premier commentaire de test',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      entityType: 'Quote',
      entityId: 1,
      userId: 2,
      userFullName: 'Dupont Jean',
      content: 'Deuxième commentaire',
      createdAt: new Date().toISOString(),
    },
  ],
  pagination: { page: 1, pageSize: 50, totalItems: 2, totalPages: 1 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CommentSection', () => {
  it('affiche "Aucun commentaire" si liste vide', async () => {
    vi.mocked(commentsApi.getComments).mockResolvedValue(emptyPage)
    renderWithProviders(<CommentSection quoteId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Aucun commentaire')).toBeInTheDocument()
    })
  })

  it('affiche Skeleton en chargement', () => {
    vi.mocked(commentsApi.getComments).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<CommentSection quoteId={1} />)

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('affiche les commentaires avec avatar, nom, contenu', async () => {
    vi.mocked(commentsApi.getComments).mockResolvedValue(commentsPage)
    renderWithProviders(<CommentSection quoteId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Martin Sophie')).toBeInTheDocument()
    })
    expect(screen.getByText('M')).toBeInTheDocument() // Avatar initial
    expect(screen.getByText('Premier commentaire de test')).toBeInTheDocument()
    expect(screen.getByText('Dupont Jean')).toBeInTheDocument()
    expect(screen.getByText('Deuxième commentaire')).toBeInTheDocument()
  })

  it('bouton désactivé si champ texte vide', async () => {
    vi.mocked(commentsApi.getComments).mockResolvedValue(emptyPage)
    renderWithProviders(<CommentSection quoteId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Aucun commentaire')).toBeInTheDocument()
    })

    const submitBtn = screen.getByRole('button', { name: 'Envoyer le commentaire' })
    expect(submitBtn).toBeDisabled()
  })

  it('soumission → appel API + toast + champ vide', async () => {
    vi.mocked(commentsApi.getComments).mockResolvedValue(emptyPage)
    vi.mocked(commentsApi.addComment).mockResolvedValue({
      id: 3,
      entityType: 'Quote',
      entityId: 1,
      userId: 1,
      userFullName: 'Martin Sophie',
      content: 'Nouveau commentaire',
      createdAt: new Date().toISOString(),
    })

    const { toast } = await import('sonner')
    const user = userEvent.setup()
    renderWithProviders(<CommentSection quoteId={1} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ajouter un commentaire...')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Ajouter un commentaire...')
    await user.type(textarea, 'Nouveau commentaire')

    const submitBtn = screen.getByRole('button', { name: 'Envoyer le commentaire' })
    expect(submitBtn).not.toBeDisabled()
    await user.click(submitBtn)

    await waitFor(() => {
      expect(commentsApi.addComment).toHaveBeenCalledWith('Quote', 1, { content: 'Nouveau commentaire' })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Commentaire ajouté')
    })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ajouter un commentaire...')).toHaveValue('')
    })
  })

  it('erreur API → toast erreur', async () => {
    vi.mocked(commentsApi.getComments).mockResolvedValue(emptyPage)
    vi.mocked(commentsApi.addComment).mockRejectedValue(new Error('Server error'))

    const { toast } = await import('sonner')
    const user = userEvent.setup()
    renderWithProviders(<CommentSection quoteId={1} />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ajouter un commentaire...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Ajouter un commentaire...'), 'Test erreur')
    await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
