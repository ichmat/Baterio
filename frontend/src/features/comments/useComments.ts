import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getComments, addComment } from './api'

export function useComments(entityType: string, entityId: number, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['comments', entityType, entityId, page, pageSize],
    queryFn: () => getComments(entityType, entityId, page, pageSize),
    enabled: !!entityType && !!entityId,
  })
}

export function useAddComment(entityType: string, entityId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: string }) => addComment(entityType, entityId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', entityType, entityId] })
      qc.invalidateQueries({ queryKey: ['audit-events', entityType, entityId] })
    },
  })
}
