import { apiClient } from '@/lib/api-client'
import type { CommentsPage, CommentResponse, CreateCommentRequest } from './types'

interface ApiResponse<T> { data: T }

export async function getComments(entityType: string, entityId: number, page = 1, pageSize = 50) {
  const res = await apiClient<ApiResponse<CommentsPage>>(
    `/comments?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}&page=${page}&pageSize=${pageSize}`
  )
  return res.data
}

export async function addComment(entityType: string, entityId: number, data: CreateCommentRequest) {
  const res = await apiClient<ApiResponse<CommentResponse>>(
    `/comments?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`,
    { method: 'POST', body: JSON.stringify(data) }
  )
  return res.data
}

export async function deleteComment(id: number) {
  await apiClient(`/comments/${id}`, { method: 'DELETE' })
}
