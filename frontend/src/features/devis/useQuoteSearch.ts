import { useQuery } from '@tanstack/react-query'
import { searchQuotes } from './api'

export function useQuoteSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ['quotes', 'search', query, limit],
    queryFn: () => searchQuotes(query, limit),
    enabled: query.length >= 2,
  })
}
