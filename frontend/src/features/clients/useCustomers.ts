import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomers, getCustomerById, createCustomer, updateCustomer } from './api'
import type { UpdateCustomerRequest } from './types'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerRequest }) =>
      updateCustomer(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers', id] })
    },
  })
}
