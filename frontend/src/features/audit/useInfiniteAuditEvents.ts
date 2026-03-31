import { useInfiniteQuery } from '@tanstack/react-query'
import { getAuditEvents } from './api'

export function useInfiniteAuditEvents(
  entityType: string,
  entityId: number,
  pageSize = 20,
  action?: string,
) {
  return useInfiniteQuery({
    queryKey: ['audit-events', entityType, entityId, pageSize, action],
    queryFn: ({ pageParam }) => getAuditEvents(entityType, entityId, pageParam, pageSize, action),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!entityType && !!entityId,
  })
}
