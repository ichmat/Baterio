import { useQuery } from '@tanstack/react-query'
import { getCustomFields } from '@/features/admin/api'

export function useCustomFieldDefinitions() {
  return useQuery({
    queryKey: ['custom-fields', 'quotes'],
    queryFn: () => getCustomFields({ appliesToQuotes: true }),
    select: (fields) =>
      [...fields].sort(
        (a, b) => (a.displayOrderQuotes ?? 999) - (b.displayOrderQuotes ?? 999),
      ),
  })
}
