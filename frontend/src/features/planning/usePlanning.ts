import { useQuery } from '@tanstack/react-query'
import { getCalendarSites, getQuoteReminders } from './api'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes — vue consultative

export function useCalendarSites(start: string | undefined, end: string | undefined) {
  return useQuery({
    queryKey: ['planning', 'sites', start, end],
    queryFn: () => getCalendarSites(start!, end!),
    enabled: !!start && !!end,
    staleTime: STALE_TIME,
  })
}

export function useQuoteReminders(start: string | undefined, end: string | undefined) {
  return useQuery({
    queryKey: ['planning', 'reminders', start, end],
    queryFn: () => getQuoteReminders(start!, end!),
    enabled: !!start && !!end,
    staleTime: STALE_TIME,
  })
}
