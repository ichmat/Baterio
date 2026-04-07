import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getGanttColumns, GANTT_WORK_START, GANTT_WORK_END } from './gantt-utils'

interface GanttTimelineProps {
  weekStart: Date
  totalColumns: number
  workStartHour?: number
  workEndHour?: number
}

export function GanttTimeline({
  weekStart,
  totalColumns,
  workStartHour = GANTT_WORK_START,
  workEndHour = GANTT_WORK_END,
}: GanttTimelineProps) {
  const columns = getGanttColumns(weekStart, workStartHour, workEndHour)
  const hoursPerDay = workEndHour - workStartHour

  // Group columns by day for the day header row
  const days: { date: Date; isToday: boolean; colStart: number; colSpan: number }[] = []
  for (let d = 0; d < 7; d++) {
    const dayColumns = columns.filter((_, i) => Math.floor(i / hoursPerDay) === d)
    if (dayColumns.length > 0) {
      days.push({
        date: dayColumns[0].date,
        isToday: dayColumns[0].isToday,
        colStart: d * hoursPerDay + 1, // 1-based for grid
        colSpan: hoursPerDay,
      })
    }
  }

  return (
    <div
      className="sticky top-0 z-20 border-b bg-background"
      role="rowgroup"
      aria-label="En-tête timeline Gantt"
    >
      {/* Day headers row */}
      <div
        className="grid"
        role="row"
        style={{
          gridTemplateColumns: `200px repeat(${totalColumns}, minmax(40px, 1fr))`,
        }}
      >
        <div className="border-b border-r px-2 py-1 text-sm font-semibold sticky left-0 z-10 bg-background">
          Chantiers
        </div>
        {days.map((day) => (
          <div
            key={day.date.toISOString()}
            className={`border-b border-r px-2 py-1 text-center text-sm font-semibold capitalize ${
              day.isToday ? 'bg-accent text-accent-foreground' : ''
            }`}
            style={{
              gridColumn: `${day.colStart + 1} / span ${day.colSpan}`,
            }}
          >
            {format(day.date, 'EEE d MMM', { locale: fr })}
          </div>
        ))}
      </div>

      {/* Hour headers row */}
      <div
        className="grid"
        role="row"
        style={{
          gridTemplateColumns: `200px repeat(${totalColumns}, minmax(40px, 1fr))`,
        }}
      >
        <div className="border-r px-2 py-0.5 sticky left-0 z-10 bg-background" />
        {columns.map((col) => (
          <div
            key={col.columnIndex}
            className={`border-r px-1 py-0.5 text-center text-xs text-muted-foreground ${
              col.isToday ? 'bg-accent/50' : ''
            }`}
            style={{ gridColumn: col.columnIndex + 2 }}
          >
            {col.hour}h
          </div>
        ))}
      </div>
    </div>
  )
}
