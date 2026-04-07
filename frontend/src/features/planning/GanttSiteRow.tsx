import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatarStack } from './user-avatar'
import { GanttWorkerRow } from './GanttWorkerRow'
import { getAssignmentBarPosition } from './gantt-utils'
import { STATUS_COLORS } from './status-colors'
import type { SiteCalendarEvent, SiteCalendarAssignment, GanttWorkerGroup } from './types'

interface GanttSiteRowProps {
  site: SiteCalendarEvent
  isExpanded: boolean
  onToggle: () => void
  totalColumns: number
  weekStart: Date
  workStartHour: number
  workEndHour: number
  onAssignmentClick: (assignment: SiteCalendarAssignment) => void
  onEmptySlotClick: (siteId: number, date: Date, hour: number) => void
  onAddWorker: (siteId: number) => void
}

export function GanttSiteRow({
  site,
  isExpanded,
  onToggle,
  totalColumns,
  weekStart,
  workStartHour,
  workEndHour,
  onAssignmentClick,
  onEmptySlotClick,
  onAddWorker,
}: GanttSiteRowProps) {
  const navigate = useNavigate()
  const colors = STATUS_COLORS[site.status] ?? STATUS_COLORS.Planned

  // Compute site bar position (full site duration)
  const siteBarPos = useMemo(() => {
    return getAssignmentBarPosition(
      { startDatetime: null, endDatetime: null },
      site,
      weekStart,
      workStartHour,
      workEndHour,
    )
  }, [site, weekStart, workStartHour, workEndHour])

  // Group assignments by worker
  const workerGroups = useMemo((): GanttWorkerGroup[] => {
    const map = new Map<number, GanttWorkerGroup>()
    for (const a of site.assignments) {
      const existing = map.get(a.userId)
      if (existing) {
        existing.assignments.push(a)
      } else {
        map.set(a.userId, {
          userId: a.userId,
          userFullName: a.userFullName,
          userAvatarUrl: a.userAvatarUrl,
          assignments: [a],
        })
      }
    }
    return Array.from(map.values())
  }, [site.assignments])

  return (
    <div role="rowgroup">
      {/* Collapsed/header row */}
      <div
        className="grid items-center border-b hover:bg-muted/30"
        style={{
          gridTemplateColumns: `200px repeat(${totalColumns}, minmax(40px, 1fr))`,
        }}
        role="row"
      >
        {/* Site name cell */}
        <div className="sticky left-0 z-10 flex items-center gap-1 bg-background px-2 py-1.5 border-r">
          <button
            onClick={onToggle}
            className="p-0.5 rounded hover:bg-accent"
            aria-label={isExpanded ? 'Replier' : 'Déplier'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => navigate(`/chantiers/${site.id}`)}
            className="text-sm font-medium truncate hover:underline text-left"
            title={site.subject}
          >
            {site.subject}
          </button>
          {!isExpanded && (
            <UserAvatarStack assignments={site.assignments} max={3} size="sm" />
          )}
        </div>

        {/* Site duration bar (collapsed mode only) */}
        {!isExpanded && siteBarPos && (
          <div
            className="relative col-start-2 h-5"
            style={{ gridColumn: `2 / span ${totalColumns}` }}
          >
            <div
              className={`absolute top-0 bottom-0 rounded ${colors.bg} border-l-2 ${colors.border}`}
              style={{
                left: `${((siteBarPos.col - 1) / totalColumns) * 100}%`,
                width: `${(siteBarPos.span / totalColumns) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Expanded: worker rows */}
      {isExpanded && (
        <>
          {workerGroups.map((group) => (
            <GanttWorkerRow
              key={group.userId}
              worker={group}
              assignments={group.assignments}
              site={site}
              totalColumns={totalColumns}
              weekStart={weekStart}
              workStartHour={workStartHour}
              workEndHour={workEndHour}
              onAssignmentClick={onAssignmentClick}
              onEmptySlotClick={onEmptySlotClick}
            />
          ))}

          {/* Add worker row */}
          <div
            className="grid items-center border-b"
            style={{
              gridTemplateColumns: `200px repeat(${totalColumns}, minmax(40px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-10 bg-background px-3 py-1 border-r">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => onAddWorker(site.id)}
                aria-label={`Ajouter un ouvrier au chantier ${site.subject}`}
              >
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
