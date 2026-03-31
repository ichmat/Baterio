import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSiteById, createSite, searchSites } from './api'

export function useSite(id: number) {
  return useQuery({
    queryKey: ['sites', id],
    queryFn: () => getSiteById(id),
    enabled: !!id,
  })
}

export function useCreateSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useSiteSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: ['sites', 'search', query, limit],
    queryFn: () => searchSites(query, limit),
    enabled: query.length >= 2,
  })
}
