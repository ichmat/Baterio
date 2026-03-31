import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineImagePreview } from '@/features/audit/InlineImagePreview'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/files/api', () => ({
  downloadFileBlob: vi.fn().mockResolvedValue(new Blob(['fake'], { type: 'image/jpeg' })),
}))

// Mock Dialog to render content directly
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="lightbox">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('InlineImagePreview', () => {
  it('affiche une miniature pour une image', async () => {
    renderWithProviders(
      <InlineImagePreview attachmentId={1} filename="photo.jpg" contentType="image/jpeg" size={245000} />,
    )

    await waitFor(() => {
      expect(screen.getByAltText('photo.jpg')).toBeInTheDocument()
    })
    expect(screen.getByText(/photo\.jpg/)).toBeInTheDocument()
    expect(screen.getByText(/239 Ko/)).toBeInTheDocument()
  })

  it('affiche un Badge pour un fichier non-image', () => {
    renderWithProviders(
      <InlineImagePreview attachmentId={2} filename="document.pdf" contentType="application/pdf" size={512000} />,
    )

    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText(/500 Ko/)).toBeInTheDocument()
    // Pas d'image
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('ouvre la lightbox au clic sur la miniature', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <InlineImagePreview attachmentId={1} filename="photo.jpg" contentType="image/jpeg" size={100} />,
    )

    await waitFor(() => {
      expect(screen.getByAltText('photo.jpg')).toBeInTheDocument()
    })

    await user.click(screen.getByAltText('photo.jpg').closest('button')!)

    await waitFor(() => {
      expect(screen.getByTestId('lightbox')).toBeInTheDocument()
    })
  })
})
