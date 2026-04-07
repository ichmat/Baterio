import { UserAvatar } from './user-avatar'
import { GanttAssignmentBar } from './GanttAssignmentBar'
import { getAssignmentBarPosition, getEmptySlotDate } from './gantt-utils'
import type { SiteCalendarAssignment, SiteCalendarEvent } from './types'

interface GanttWorkerRowProps {
  worker: { userId: number; userFullName: string; userAvatarUrl?: string | null }
  assignments: SiteCalendarAssignment[]
  site: SiteCalendarEvent
  totalColumns: number
  weekStart: Date
  workStartHour: number
  workEndHour: number
  onAssignmentClick: (assignment: SiteCalendarAssignment) => void
  onEmptySlotClick: (siteId: number, date: Date, hour: number) => void
}

export function GanttWorkerRow({
  worker,
  assignments,
  site,
  totalColumns,
  weekStart,
  workStartHour,
  workEndHour,
  onAssignmentClick,
  onEmptySlotClick,
}: GanttWorkerRowProps) {
  // Compute bar positions for all assignments
  const bars = assignments
    .map((a) => {
      const pos = getAssignmentBarPosition(a, site, weekStart, workStartHour, workEndHour)
      if (!pos) return null
      return { assignment: a, ...pos }
    })
    .filter(Boolean) as { assignment: SiteCalendarAssignment; col: number; span: number }[]

  // Build a set of occupied columns for detecting empty slots
  const occupiedCols = new Set<number>()
  for (const bar of bars) {
    for (let c = bar.col; c < bar.col + bar.span; c++) {
      occupiedCols.add(c)
    }
  }

  const fakeAssignment: SiteCalendarAssignment = {
    id: 0,
    siteId: site.id,
    userId: worker.userId,
    userFullName: worker.userFullName,
    userAvatarUrl: worker.userAvatarUrl ?? null,
    startDatetime: null,
    endDatetime: null,
    createdAt: '',
  }

  return (
    <div
      className="grid items-center border-b hover:bg-muted/30"
      style={{
        gridTemplateColumns: `200px repeat(${totalColumns}, minmax(40px, 1fr))`,
      }}
      role="row"
    >
      {/* Worker name cell */}
      <div className="sticky left-0 z-10 flex items-center gap-2 bg-background px-3 py-1 border-r">
        <UserAvatar assignment={fakeAssignment} size="sm" />
        <span className="text-xs truncate">{worker.userFullName}</span>
      </div>

      {/* Grid area for bars and empty slot buttons */}
      <div
        className="relative h-7"
        style={{ gridColumn: `2 / span ${totalColumns}` }}
      >
        {/* Assignment bars */}
        {bars.map((bar) => (
          <GanttAssignmentBar
            key={bar.assignment.id}
            assignment={bar.assignment}
            siteSubject={site.subject}
            siteStatus={site.status}
            col={bar.col}
            span={bar.span}
            totalColumns={totalColumns}
            isFullDuration={bar.assignment.startDatetime === null && bar.assignment.endDatetime === null}
            onClick={() => onAssignmentClick(bar.assignment)}
          />
        ))}

        {/* Empty slot click zones — inside the relative container */}
        {Array.from({ length: totalColumns }, (_, i) => {
          const colNum = i + 1
          if (occupiedCols.has(colNum)) return null
          return (
            <button
              key={`empty-${i}`}
              className="absolute top-0 h-full cursor-pointer hover:bg-accent/30"
              style={{
                left: `${(i / totalColumns) * 100}%`,
                width: `${(1 / totalColumns) * 100}%`,
              }}
              onClick={() => {
                const { date, hour } = getEmptySlotDate(i, weekStart, workStartHour, workEndHour)
                onEmptySlotClick(site.id, date, hour)
              }}
              aria-label={`Ajouter attribution colonne ${i + 1}`}
            />
          )
        })}
      </div>
    </div>
  )
}
