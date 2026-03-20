import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttachments, uploadFile, deleteAttachment, downloadFileBlob } from './api'
import { invalidateImageCache } from './useImageUrl'

export function useAttachments(entityType: string, entityId: number) {
  return useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () => getAttachments(entityType, entityId),
    enabled: !!entityType && !!entityId,
  })
}

export function useUploadFile(entityType: string, entityId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadFile(entityType, entityId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
      qc.invalidateQueries({ queryKey: ['audit-events', entityType, entityId] })
    },
  })
}

export function useDeleteAttachment(entityType: string, entityId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAttachment(id),
    onSuccess: (_data, id) => {
      invalidateImageCache(id)
      qc.invalidateQueries({ queryKey: ['attachments', entityType, entityId] })
      qc.invalidateQueries({ queryKey: ['audit-events', entityType, entityId] })
    },
  })
}

export function useDownloadFile() {
  return async (id: number, filename: string) => {
    const blob = await downloadFileBlob(id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
