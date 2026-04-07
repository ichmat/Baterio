import { useMemo } from 'react'
import { format, isSameMonth, isToday } from 'date-fns'
import { getMonthGrid } from './calendar-utils'
import { CalendarEventComponent } from './CalendarEvent'
import { ReminderEvent } from './ReminderEvent'
import type { CalendarEvent } from './types'

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

const MAX_EVENTS_PER_CELL = 3

export function MonthView({ currentDate, events, onEventClick }: MonthViewProps) {
  const grid = useMemo(() => getMonthGrid(currentDate), [currentDate])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    const allDays = grid.flat()
    for (const day of allDays) {
      const key = format(day, 'yyyy-MM-dd')
      const dayEvents = events.filter((e) => e.start <= day && e.end >= day)
      if (dayEvents.length > 0) {
        map.set(key, dayEvents)
      }
    }
    return map
  }, [grid, events])

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b">
        {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => (
          <div key={d} className="px-1 py-1 text-center text-xs font-medium text-muted-foreground capitalize">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      {grid.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 border-b">
          {week.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay.get(key) ?? []
            const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_CELL)
            const overflow = dayEvents.length - MAX_EVENTS_PER_CELL

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] border-r p-0.5 last:border-r-0 ${
                  !isSameMonth(day, currentDate)
                    ? 'bg-muted/50 text-muted-foreground'
                    : ''
                } ${isToday(day) ? 'bg-accent/30' : ''}`}
              >
                <div className={`mb-0.5 px-0.5 text-xs ${isToday(day) ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {visibleEvents.map((event) =>
                    event.type === 'reminder' ? (
                      <ReminderEvent key={event.id} event={event} onClick={onEventClick} compact />
                    ) : (
                      <CalendarEventComponent key={event.id} event={event} onClick={onEventClick} compact />
                    ),
                  )}
                  {overflow > 0 && (
                    <div className="px-0.5 text-[10px] text-muted-foreground">
                      +{overflow}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
