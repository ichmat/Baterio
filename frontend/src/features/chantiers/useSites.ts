import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSiteById, createSite, searchSites, getSitesByCustomer, deleteSite, updateSite, updateSiteStatus, getSites,
  getSiteAssignments, createAssignment, createBatchAssignment, updateAssignment, deleteAssignment,
  checkConflicts, confirmAdjustments, getAssignmentPresets, updateAssignmentPresets,
} from './api'
import type {
  UpdateSiteRequest, SiteListFilters, CreateAssignmentRequest, CreateBatchAssignmentRequest,
  UpdateAssignmentRequest, AssignmentAdjustment, AssignmentPreset,
} from './types'

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

// --- Site Assignments ---

export function useSiteAssignments(siteId: number) {
  return useQuery({
    queryKey: ['sites', siteId, 'assignments'],
    queryFn: () => getSiteAssignments(siteId),
    enabled: !!siteId,
  })
}

export function useCreateAssignment(siteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssignmentRequest) => createAssignment(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', siteId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useCreateBatchAssignment(siteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBatchAssignmentRequest) => createBatchAssignment(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', siteId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useUpdateAssignment(siteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: UpdateAssignmentRequest }) =>
      updateAssignment(siteId, assignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', siteId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useDeleteAssignment(siteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: number) => deleteAssignment(siteId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', siteId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useCheckConflicts(siteId: number) {
  return useMutation({
    mutationFn: (data: { userId: number; startDatetime?: string | null; endDatetime?: string | null; excludeAssignmentId?: number }) =>
      checkConflicts(siteId, data),
  })
}

export function useConfirmAdjustments(siteId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adjustments: AssignmentAdjustment[]) => confirmAdjustments(siteId, adjustments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', siteId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['sites'] })
    },
  })
}

export function useAssignmentPresets() {
  return useQuery({
    queryKey: ['assignment-presets'],
    queryFn: getAssignmentPresets,
  })
}

export function useUpdateAssignmentPresets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (presets: AssignmentPreset[]) => updateAssignmentPresets(presets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-presets'] })
    },
  })
}
