import { apiClient, apiFetchRaw } from '@/lib/api-client'
import type { AttachmentResponse } from './types'

interface ApiResponse<T> { data: T }

export async function getAttachments(entityType: string, entityId: number) {
  const res = await apiClient<ApiResponse<AttachmentResponse[]>>(
    `/files?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`
  )
  return res.data
}

export async function uploadFile(entityType: string, entityId: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient<ApiResponse<AttachmentResponse>>(
    `/files?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
    { method: 'POST', body: formData }
  )
  return res.data
}

export async function deleteAttachment(id: number) {
  await apiClient(`/files/${id}`, { method: 'DELETE' })
}

export async function downloadFileBlob(id: number): Promise<Blob> {
  const res = await apiFetchRaw(`/files/${id}/download`)
  return res.blob()
}
