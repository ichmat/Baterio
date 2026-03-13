import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomFields, createCustomField, updateCustomField, deleteCustomField, reorderCustomFields } from './api'
import type { CreateCustomFieldRequest, UpdateCustomFieldRequest, ReorderCustomFieldsRequest } from './types'

export function useCustomFields() {
  return useQuery({
    queryKey: ['custom-fields'],
    queryFn: getCustomFields,
  })
}

export function useCreateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomFieldRequest) => createCustomField(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] })
    },
  })
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomFieldRequest }) => updateCustomField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] })
    },
  })
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] })
    },
  })
}

export function useReorderCustomFields() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ReorderCustomFieldsRequest) => reorderCustomFields(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] })
    },
  })
}
