import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQuotes, getQuoteById, createQuote, updateQuote, updateQuoteStatus } from './api'
import type { UpdateQuoteRequest, UpdateQuoteStatusRequest } from './types'

export function useQuotes(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['quotes', page, pageSize],
    queryFn: () => getQuotes(page, pageSize),
  })
}

export function useQuote(id: number) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => getQuoteById(id),
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}

export function useUpdateQuote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteRequest }) =>
      updateQuote(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quotes', id] })
    },
  })
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuoteStatusRequest }) =>
      updateQuoteStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quotes', id] })
    },
  })
}
