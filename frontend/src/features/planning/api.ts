import { apiClient } from '@/lib/api-client'
import type { SiteCalendarEvent, QuoteReminderEvent } from './types'

interface ApiResponse<T> {
  data: T
}

export async function getCalendarSites(
  start: string,
  end: string,
): Promise<SiteCalendarEvent[]> {
  const res = await apiClient<ApiResponse<SiteCalendarEvent[]>>(
    `/sites/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  )
  return res.data
}

export async function getQuoteReminders(
  start: string,
  end: string,
): Promise<QuoteReminderEvent[]> {
  const res = await apiClient<ApiResponse<QuoteReminderEvent[]>>(
    `/quotes/reminders?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  )
  return res.data
}
