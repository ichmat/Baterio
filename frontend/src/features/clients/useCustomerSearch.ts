import { useQuery } from '@tanstack/react-query'
import { searchCustomers } from './api'

export function useCustomerSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ['customers', 'search', query, limit],
    queryFn: () => searchCustomers(query, limit),
    enabled: query.length >= 2,
  })
}
