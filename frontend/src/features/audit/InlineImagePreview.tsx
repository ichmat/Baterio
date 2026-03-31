import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useImageUrl } from '@/features/files/useImageUrl'
import { formatFileSize } from '@/lib/format-file-size'

interface InlineImagePreviewProps {
  attachmentId: number
  filename: string
  contentType: string
  size: number
}

function isImage(contentType: string) {
  return contentType.startsWith('image/')
}

export function InlineImagePreview({ attachmentId, filename, contentType, size }: InlineImagePreviewProps) {
  const imageUrl = useImageUrl(isImage(contentType) ? attachmentId : null)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!isImage(contentType)) {
    return (
      <div className="mt-2 flex items-center gap-1 text-xs">
        <Badge variant="outline">
          <Paperclip className="mr-1 h-3 w-3" />
          {filename}
        </Badge>
        <span className="text-muted-foreground">{formatFileSize(size)}</span>
      </div>
    )
  }

  return (
    <>
      <div className="mt-2">
        <button
          className="block overflow-hidden rounded-md border hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={() => setLightboxOpen(true)}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={filename} className="max-w-[200px] max-h-[150px] object-cover" />
          ) : (
            <></>
          )}
        </button>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" />
          {filename} · {formatFileSize(size)}
        </div>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          <DialogHeader>
            <DialogTitle>{filename}</DialogTitle>
          </DialogHeader>
          {imageUrl && (
            <img src={imageUrl} alt={filename} className="max-h-[80vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
