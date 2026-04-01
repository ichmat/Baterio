import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadZone } from '@/features/devis/FileUploadZone'
import * as filesApi from '@/features/files/api'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/files/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockAttachments = [
  {
    id: 1,
    entityType: 'Quote',
    entityId: 1,
    filename: 'photo-chantier.png',
    contentType: 'image/png',
    size: 524288,
    uploadedBy: 1,
    uploadedByName: 'Martin Sophie',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    entityType: 'Quote',
    entityId: 1,
    filename: 'devis-details.pdf',
    contentType: 'application/pdf',
    size: 1048576,
    uploadedBy: 1,
    uploadedByName: 'Martin Sophie',
    createdAt: new Date().toISOString(),
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FileUploadZone', () => {
  it('affiche "Aucune pièce jointe" si liste vide', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue([])
    renderWithProviders(<FileUploadZone entityType="Quote" entityId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Aucune pièce jointe')).toBeInTheDocument()
    })
  })

  it('affiche la liste avec nom, taille, auteur', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    renderWithProviders(<FileUploadZone entityType="Quote" entityId={1} />)

    await waitFor(() => {
      expect(screen.getByText('photo-chantier.png')).toBeInTheDocument()
    })
    expect(screen.getByText('devis-details.pdf')).toBeInTheDocument()
    expect(screen.getByText('512 Ko')).toBeInTheDocument()
    expect(screen.getByText('1.0 Mo')).toBeInTheDocument()
  })

  it('upload réussi → toast + refresh', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue([])
    vi.mocked(filesApi.uploadFile).mockResolvedValue({
      id: 3,
      entityType: 'Quote',
      entityId: 1,
      filename: 'new-file.jpg',
      contentType: 'image/jpeg',
      size: 100000,
      uploadedBy: 1,
      uploadedByName: 'Martin Sophie',
      createdAt: new Date().toISOString(),
    })

    const { toast } = await import('sonner')
    const user = userEvent.setup()
    renderWithProviders(<FileUploadZone entityType="Quote" entityId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Ajouter un fichier')).toBeInTheDocument()
    })

    // Simulate file upload via input
    const file = new File(['content'], 'new-file.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(filesApi.uploadFile).toHaveBeenCalledWith('Quote', 1, file)
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Fichier ajouté')
    })
  })

  it('spinner pendant upload', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue([])
    // Make upload hang
    vi.mocked(filesApi.uploadFile).mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    renderWithProviders(<FileUploadZone entityType="Quote" entityId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Ajouter un fichier')).toBeInTheDocument()
    })

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    // Button should be disabled and show spinner (Loader2 has animate-spin class)
    await waitFor(() => {
      const uploadBtn = screen.getByText('Ajouter un fichier').closest('button')
      expect(uploadBtn).toBeDisabled()
    })
  })

  it('upload erreur → toast erreur', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue([])
    vi.mocked(filesApi.uploadFile).mockRejectedValue({ message: 'Le fichier dépasse la taille maximale de 10 Mo' })

    const { toast } = await import('sonner')
    const user = userEvent.setup()
    renderWithProviders(<FileUploadZone entityType="Quote" entityId={1} />)

    await waitFor(() => {
      expect(screen.getByText('Ajouter un fichier')).toBeInTheDocument()
    })

    const file = new File([new ArrayBuffer(11_000_000)], 'big.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('suppression avec confirmation → toast + refresh', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    vi.mocked(filesApi.deleteAttachment).mockResolvedValue(undefined)

    const { toast } = await import('sonner')
    const user = userEvent.setup()
    renderWithProviders(<FileUploadZone entityType="Quote" entityId={1} />)

    await waitFor(() => {
      expect(screen.getByText('photo-chantier.png')).toBeInTheDocument()
    })

    // Click delete icon for first file (trash icon buttons)
    const deleteButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('[class*="text-destructive"]')
    )
    expect(deleteButtons.length).toBeGreaterThan(0)
    await user.click(deleteButtons[0])

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Supprimer ce fichier ?')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Supprimer'))

    await waitFor(() => {
      expect(filesApi.deleteAttachment).toHaveBeenCalledWith(1)
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Fichier supprimé')
    })
  })
})
