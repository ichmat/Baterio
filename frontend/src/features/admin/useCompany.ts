import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCompanyInfo, updateCompanyInfo, getSubscriptionInfo } from './api'
import type { UpdateCompanyInfoRequest } from './types'

export function useCompanyInfo() {
  return useQuery({
    queryKey: ['company-info'],
    queryFn: getCompanyInfo,
  })
}

export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateCompanyInfoRequest) => updateCompanyInfo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-info'] })
    },
  })
}

export function useSubscriptionInfo() {
  return useQuery({
    queryKey: ['subscription-info'],
    queryFn: getSubscriptionInfo,
  })
}
