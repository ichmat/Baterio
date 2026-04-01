import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSiteById, createSite, searchSites, getSitesByCustomer, deleteSite, updateSite, updateSiteStatus, getSites } from './api'
import type { UpdateSiteRequest, SiteListFilters } from './types'

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

export function useDeleteSite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useSitesByCustomer(customerId: number) {
  return useQuery({
    queryKey: ['sites', 'by-customer', customerId],
    queryFn: () => getSitesByCustomer(customerId),
    enabled: !!customerId,
  })
}

export function useSiteSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: ['sites', 'search', query, limit],
    queryFn: () => searchSites(query, limit),
    enabled: query.length >= 2,
  })
}

export function useUpdateSite(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateSiteRequest) => updateSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', id] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useUpdateSiteStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: string) => updateSiteStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', id] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useSites(page: number, pageSize: number, filters?: SiteListFilters) {
  return useQuery({
    queryKey: ['sites', 'list', page, pageSize, filters?.status, filters?.search, filters?.sortBy, filters?.sortDirection],
    queryFn: () => getSites(page, pageSize, filters),
  })
}
