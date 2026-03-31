import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MediaGallery } from '@/features/devis/MediaGallery'
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
    filename: 'photo1.jpg',
    contentType: 'image/jpeg',
    size: 100000,
    uploadedBy: 1,
    uploadedByName: 'Martin Sophie',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    entityType: 'Quote',
    entityId: 1,
    filename: 'document.pdf',
    contentType: 'application/pdf',
    size: 200000,
    uploadedBy: 1,
    uploadedByName: 'Martin Sophie',
    createdAt: new Date().toISOString(),
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  // Mock downloadFileBlob for useImageUrl
  vi.mocked(filesApi.downloadFileBlob).mockResolvedValue(new Blob(['fake'], { type: 'image/jpeg' }))
})

describe('MediaGallery', () => {
  it('affiche la grille avec miniatures', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    renderWithProviders(
      <MediaGallery quoteId={1} open={true} onOpenChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBe(2)
    })
  })

  it('fichier non-image affiché avec nom de fichier', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    renderWithProviders(
      <MediaGallery quoteId={1} open={true} onOpenChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBe(2)
    })

    // PDF file shows filename in thumbnail (within the gridcell button inner text)
    const gridCells = screen.getAllByRole('gridcell')
    const pdfCell = gridCells[1]
    expect(pdfCell.textContent).toContain('document.pdf')
  })

  it('Dialog a role="grid"', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    renderWithProviders(
      <MediaGallery quoteId={1} open={true} onOpenChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })
  })

  it('miniatures sont cliquables', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    renderWithProviders(
      <MediaGallery quoteId={1} open={true} onOpenChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBe(2)
    })

    // Verify gridcells are buttons (clickable)
    const gridCells = screen.getAllByRole('gridcell')
    gridCells.forEach(cell => {
      expect(cell.tagName).toBe('BUTTON')
    })
  })

  it('navigation clavier ArrowRight/ArrowLeft dans la grille', async () => {
    vi.mocked(filesApi.getAttachments).mockResolvedValue(mockAttachments)
    const user = userEvent.setup()
    renderWithProviders(
      <MediaGallery quoteId={1} open={true} onOpenChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBe(2)
    })

    const cells = screen.getAllByRole('gridcell')

    // Focus first cell
    cells[0].focus()
    expect(document.activeElement).toBe(cells[0])

    // ArrowRight → second cell
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(cells[1])

    // ArrowLeft → back to first
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cells[0])

    // ArrowLeft at start → stays at first (no negative index)
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(cells[0])
  })

  it('navigation clavier ArrowDown/ArrowUp dans la grille', async () => {
    // Explicitly set innerWidth so test doesn't depend on happy-dom default
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })

    // Need enough items to have multiple rows. 1024px → 4 cols (lg breakpoint)
    // So we need at least 5 items to have a second row
    const manyAttachments = Array.from({ length: 6 }, (_, i) => ({
      ...mockAttachments[0],
      id: i + 1,
      filename: `photo${i + 1}.jpg`,
    }))
    vi.mocked(filesApi.getAttachments).mockResolvedValue(manyAttachments)
    const user = userEvent.setup()
    renderWithProviders(
      <MediaGallery quoteId={1} open={true} onOpenChange={() => {}} />
    )

    await waitFor(() => {
      expect(screen.getAllByRole('gridcell').length).toBe(6)
    })

    const cells = screen.getAllByRole('gridcell')

    // Focus first cell
    cells[0].focus()
    expect(document.activeElement).toBe(cells[0])

    // Determine cols from window.innerWidth (same logic as component)
    const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2

    // ArrowDown → goes to cell[cols]
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(cells[cols])

    // ArrowUp → back to cell[0]
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(cells[0])
  })
})
