import { useState, useCallback, useRef } from 'react'
import { File as FileIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttachments } from '@/features/files/useFiles'
import { useImageUrl } from '@/features/files/useImageUrl'
import type { AttachmentResponse } from '@/features/files/types'

interface MediaGalleryProps {
  quoteId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isImage(contentType: string) {
  return contentType.startsWith('image/')
}

function GalleryThumbnail({
  attachment,
  onClick,
}: {
  attachment: AttachmentResponse
  onClick: (cachedUrl: string | null) => void
}) {
  const imageUrl = useImageUrl(isImage(attachment.contentType) ? attachment.id : null)

  return (
    <button
      role="gridcell"
      className="relative aspect-square overflow-hidden rounded-md border bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      onClick={() => onClick(imageUrl)}
    >
      {isImage(attachment.contentType) ? (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={attachment.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <Skeleton className="h-full w-full" />
        )
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground w-full text-center">
            {attachment.filename}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5">
        <span className="truncate text-xs text-white block">{attachment.filename}</span>
      </div>
    </button>
  )
}

export function MediaGallery({ quoteId, open, onOpenChange }: MediaGalleryProps) {
  const { data: attachments } = useAttachments('Quote', quoteId)
  const [lightboxItem, setLightboxItem] = useState<AttachmentResponse | null>(null)
  const lightboxUrlRef = useRef<string | null>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const grid = e.currentTarget
    const cells = Array.from(grid.querySelectorAll('[role="gridcell"]')) as HTMLElement[]
    const idx = cells.indexOf(document.activeElement as HTMLElement)
    if (idx === -1) return

    const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2

    if (e.key === 'ArrowRight' && idx < cells.length - 1) {
      e.preventDefault()
      cells[idx + 1].focus()
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault()
      cells[idx - 1].focus()
    } else if (e.key === 'ArrowDown' && idx + cols < cells.length) {
      e.preventDefault()
      cells[idx + cols].focus()
    } else if (e.key === 'ArrowUp' && idx - cols >= 0) {
      e.preventDefault()
      cells[idx - cols].focus()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      cells[idx].click()
    }
  }, [])

  const openLightbox = useCallback((att: AttachmentResponse, cachedUrl: string | null) => {
    lightboxUrlRef.current = cachedUrl
    setLightboxItem(att)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxItem(null)
    lightboxUrlRef.current = null
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Galerie médias</DialogTitle>
          </DialogHeader>
          <div
            role="grid"
            className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4"
            onKeyDown={handleKeyDown}
          >
            {attachments?.map(att => (
              <GalleryThumbnail
                key={att.id}
                attachment={att}
                onClick={(cachedUrl) => openLightbox(att, cachedUrl)}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox — reuses cached blob URL from thumbnail */}
      <Dialog open={!!lightboxItem} onOpenChange={(o) => !o && closeLightbox()}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <DialogHeader>
            <DialogTitle>{lightboxItem?.filename}</DialogTitle>
          </DialogHeader>
          {lightboxItem && isImage(lightboxItem.contentType) && lightboxUrlRef.current ? (
            <img
              src={lightboxUrlRef.current}
              alt={lightboxItem.filename}
              className="max-h-[80vh] w-full object-contain"
            />
          ) : lightboxItem ? (
            <div className="flex items-center justify-center py-12">
              <FileIcon className="h-16 w-16 text-muted-foreground" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
