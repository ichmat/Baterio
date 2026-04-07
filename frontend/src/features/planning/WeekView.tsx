import { format, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getWeekDays, layoutEvents, getDayPosition } from './calendar-utils'
import { CalendarEventComponent } from './CalendarEvent'
import { ReminderEvent } from './ReminderEvent'
import type { CalendarEvent } from './types'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export function WeekView({ currentDate, events, onEventClick }: WeekViewProps) {
  const days = getWeekDays(currentDate)
  const weekStart = days[0]
  const weekEnd = days[6]

  const siteEvents = events.filter((e) => e.type === 'site')
  const reminderEvents = events.filter((e) => e.type === 'reminder')

  const lanes = layoutEvents(siteEvents, weekStart, weekEnd)

  return (
    <div className="overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`px-2 py-1.5 text-center text-xs font-medium ${
              isToday(day) ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            <div className="capitalize">{format(day, 'EEE', { locale: fr })}</div>
            <div className={`text-lg ${isToday(day) ? 'font-bold' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Multi-day event lanes */}
      {lanes.length > 0 && (
        <div className="relative border-b">
          {lanes.map((lane, laneIndex) => (
            <div key={laneIndex} className="grid grid-cols-7 gap-px" style={{ minHeight: '28px' }}>
              {lane.map((event) => {
                const { col, span } = getDayPosition(event, weekStart, weekEnd)
                return (
                  <div
                    key={event.id}
                    className="px-0.5 py-0.5"
                    style={{
                      gridColumn: `${col} / span ${span}`,
                    }}
                  >
                    <CalendarEventComponent event={event} onClick={onEventClick} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Reminder events per day */}
      {reminderEvents.length > 0 && (
        <div className="grid grid-cols-7 gap-px">
          {days.map((day) => {
            const dayReminders = reminderEvents.filter(
              (e) => format(e.start, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'),
            )
            return (
              <div key={day.toISOString()} className="space-y-0.5 p-0.5">
                {dayReminders.map((event) => (
                  <ReminderEvent key={event.id} event={event} onClick={onEventClick} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state handled by parent */}
    </div>
  )
}
