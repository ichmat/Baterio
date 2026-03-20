import { useState, useEffect } from 'react'
import { downloadFileBlob } from './api'

/** Charge une image protegee par Bearer token et retourne une blob URL */
export function useImageUrl(attachmentId: number | null) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!attachmentId) return
    let revoked = false
    let blobUrl: string | null = null
    downloadFileBlob(attachmentId).then(blob => {
      if (!revoked) {
        blobUrl = URL.createObjectURL(blob)
        setUrl(blobUrl)
      }
    }).catch(() => setUrl(null))
    return () => {
      revoked = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [attachmentId])

  return url
}
