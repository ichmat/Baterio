import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BellRing, Building2 } from 'lucide-react'
import { getWeekDays, getEventDayIndicator } from './calendar-utils'
import type { CalendarEvent } from './types'

interface ListDayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export function ListDayView({ currentDate, events, onEventClick }: ListDayViewProps) {
  const days = getWeekDays(currentDate)

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayEvents = events.filter((e) => e.start <= day && e.end >= day)

        if (dayEvents.length === 0) return null

        return (
          <div key={day.toISOString()}>
            <h3 className="sticky top-0 bg-background px-2 py-1 text-sm font-semibold capitalize border-b">
              {format(day, 'EEEE d MMMM', { locale: fr })}
            </h3>
            <div className="space-y-1 p-2">
              {dayEvents.map((event) => {
                if (event.type === 'reminder') {
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="flex w-full items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-left cursor-pointer dark:border-amber-800 dark:bg-amber-900/30"
                    >
                      <BellRing className="h-4 w-4 shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.reference} — {event.title}
                        </p>
                      </div>
                    </button>
                  )
                }

                const indicator = getEventDayIndicator(event, day)
                const isMultiDay = indicator.total > 1

                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="flex w-full items-center gap-2 rounded-md border p-2 text-left cursor-pointer hover:bg-accent"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        {isMultiDay && (
                          <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                            Jour {indicator.day}/{indicator.total}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {event.customerName}
                        {event.siteAddress && ` — ${event.siteAddress}`}
                      </p>
                    </div>
                    {event.assignments && event.assignments.length > 0 && (
                      <div className="flex -space-x-1">
                        {event.assignments.slice(0, 3).map((a) => (
                          <div
                            key={a.userId}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
                            title={a.userFullName}
                          >
                            {a.userFullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        ))}
                        {event.assignments.length > 3 && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px]">
                            +{event.assignments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
