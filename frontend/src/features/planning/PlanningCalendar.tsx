import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  format,
  parseISO,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useCalendarSites, useQuoteReminders } from './usePlanning'
import { CalendarHeader, type CalendarViewMode } from './CalendarHeader'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { ListDayView } from './ListDayView'
import { Skeleton } from '@/components/ui/skeleton'
import type { CalendarEvent, PlanningFilters, SiteCalendarEvent, QuoteReminderEvent } from './types'

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  Planned: { bg: 'bg-blue-100', border: 'border-l-blue-500' },
  InProgress: { bg: 'bg-yellow-100', border: 'border-l-yellow-500' },
  Paused: { bg: 'bg-gray-100', border: 'border-l-gray-400' },
  Completed: { bg: 'bg-green-100', border: 'border-l-green-500' },
}

function transformSiteToEvent(site: SiteCalendarEvent): CalendarEvent {
  return {
    id: `site-${site.id}`,
    type: 'site',
    title: site.subject,
    start: parseISO(site.startDate),
    end: parseISO(site.endDate),
    color: STATUS_COLORS[site.status]?.bg ?? STATUS_COLORS.Planned.bg,
    borderColor: STATUS_COLORS[site.status]?.border ?? STATUS_COLORS.Planned.border,
    siteId: site.id,
    status: site.status,
    customerName: site.customerName,
    siteAddress: site.siteAddress,
    reference: site.reference,
    assignments: site.assignments,
  }
}

function transformReminderToEvent(quote: QuoteReminderEvent): CalendarEvent {
  return {
    id: `reminder-${quote.id}`,
    type: 'reminder',
    title: `${quote.customerName} — ${quote.subject}`,
    start: parseISO(quote.reminderDate),
    end: parseISO(quote.reminderDate),
    color: 'bg-amber-50',
    borderColor: 'border-l-amber-500',
    quoteId: quote.id,
    customerName: quote.customerName,
    reference: quote.reference,
  }
}

interface PlanningCalendarProps {
  filters: PlanningFilters
}

export function PlanningCalendar({ filters }: PlanningCalendarProps) {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Compute date range for API fetch
  const dateRange = useMemo(() => {
    const effectiveView = isMobile ? 'week' : viewMode
    if (effectiveView === 'week') {
      const ws = startOfWeek(currentDate, { locale: fr, weekStartsOn: 1 })
      const we = endOfWeek(currentDate, { locale: fr, weekStartsOn: 1 })
      return {
        start: format(ws, 'yyyy-MM-dd'),
        end: format(we, 'yyyy-MM-dd'),
      }
    }
    // Month view: fetch a wider range to include partial weeks
    const ms = startOfWeek(startOfMonth(currentDate), { locale: fr, weekStartsOn: 1 })
    const me = endOfWeek(endOfMonth(currentDate), { locale: fr, weekStartsOn: 1 })
    return {
      start: format(ms, 'yyyy-MM-dd'),
      end: format(me, 'yyyy-MM-dd'),
    }
  }, [currentDate, viewMode, isMobile])

  const { data: sites, isLoading: sitesLoading } = useCalendarSites(dateRange.start, dateRange.end)
  const { data: reminders, isLoading: remindersLoading } = useQuoteReminders(dateRange.start, dateRange.end)

  const isLoading = sitesLoading || remindersLoading

  // Transform & filter events
  const events = useMemo(() => {
    const result: CalendarEvent[] = []

    if (filters.showSites && sites) {
      for (const site of sites) {
        if (filters.siteStatuses.includes(site.status)) {
          result.push(transformSiteToEvent(site))
        }
      }
    }

    if (filters.showReminders && reminders) {
      for (const reminder of reminders) {
        result.push(transformReminderToEvent(reminder))
      }
    }

    return result
  }, [sites, reminders, filters])

  function handlePrev() {
    const effectiveView = isMobile ? 'week' : viewMode
    setCurrentDate((d) =>
      effectiveView === 'week' ? addWeeks(d, -1) : addMonths(d, -1),
    )
  }

  function handleNext() {
    const effectiveView = isMobile ? 'week' : viewMode
    setCurrentDate((d) =>
      effectiveView === 'week' ? addWeeks(d, 1) : addMonths(d, 1),
    )
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  function handleEventClick(event: CalendarEvent) {
    if (event.type === 'site' && event.siteId) {
      navigate(`/chantiers/${event.siteId}`)
    } else if (event.type === 'reminder' && event.quoteId) {
      navigate(`/devis/${event.quoteId}`)
    }
  }

  const effectiveView = isMobile ? 'week' : viewMode
  const viewLabel = effectiveView === 'week' ? 'cette semaine' : 'ce mois'

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={setViewMode}
        showViewSwitch={!isMobile}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <CalendarIcon className="h-12 w-12" />
          <p>Aucun chantier planifié {viewLabel}</p>
        </div>
      ) : isMobile ? (
        <ListDayView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
        />
      ) : effectiveView === 'week' ? (
        <WeekView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
        />
      ) : (
        <MonthView
          currentDate={currentDate}
          events={events}
          onEventClick={handleEventClick}
        />
      )}
    </div>
  )
}
