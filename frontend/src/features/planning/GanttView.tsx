import { useState, useMemo, useCallback } from 'react'
import {
  addDays,
  addWeeks,
  format,
} from 'date-fns'
import { AlertTriangle, Calendar as CalendarIcon } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useCalendarSites } from './usePlanning'
import { CalendarHeader } from './CalendarHeader'
import { GanttTimeline } from './GanttTimeline'
import { GanttSiteRow } from './GanttSiteRow'
import { GanttMobileView } from './GanttMobileView'
import { AssignWorkerDialog } from '@/features/chantiers/AssignWorkerDialog'
import { EditAssignmentDialog } from '@/features/chantiers/EditAssignmentDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getGanttWeekStart, GANTT_WORK_START, GANTT_WORK_END } from './gantt-utils'
import type { PlanningFilters, SiteCalendarAssignment } from './types'
import type { SiteAssignment } from '@/features/chantiers/types'

function toSiteAssignment(a: SiteCalendarAssignment): SiteAssignment {
  return {
    id: a.id,
    siteId: a.siteId,
    userId: a.userId,
    userFullName: a.userFullName,
    userAvatarUrl: a.userAvatarUrl,
    startDatetime: a.startDatetime,
    endDatetime: a.endDatetime,
    createdAt: a.createdAt,
  }
}

interface GanttViewProps {
  filters: PlanningFilters
}

export function GanttView({ filters }: GanttViewProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedSiteIds, setExpandedSiteIds] = useState<Set<number>>(new Set())

  // Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDialogSiteId, setAssignDialogSiteId] = useState<number | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editDialogAssignment, setEditDialogAssignment] = useState<SiteAssignment | null>(null)
  const [editDialogSiteId, setEditDialogSiteId] = useState<number | null>(null)

  const weekStart = useMemo(() => getGanttWeekStart(currentDate), [currentDate])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const startISO = format(weekStart, 'yyyy-MM-dd')
  const endISO = format(weekEnd, 'yyyy-MM-dd')

  const { data: sites, isLoading, isError } = useCalendarSites(startISO, endISO)

  const hoursPerDay = GANTT_WORK_END - GANTT_WORK_START
  const totalColumns = 7 * hoursPerDay

  // Filter sites by planning filters
  const filteredSites = useMemo(() => {
    if (!sites || !filters.showSites) return []
    return sites.filter((s) => filters.siteStatuses.includes(s.status))
  }, [sites, filters])

  const toggleExpand = useCallback((siteId: number) => {
    setExpandedSiteIds((prev) => {
      const next = new Set(prev)
      if (next.has(siteId)) {
        next.delete(siteId)
      } else {
        next.add(siteId)
      }
      return next
    })
  }, [])

  const handleAssignmentClick = useCallback((assignment: SiteCalendarAssignment, siteId?: number) => {
    const targetSiteId = siteId ?? assignment.siteId
    setEditDialogAssignment(toSiteAssignment(assignment))
    setEditDialogSiteId(targetSiteId)
    setEditDialogOpen(true)
  }, [])

  const handleEmptySlotClick = useCallback((siteId: number, _date: Date, _hour: number) => {
    setAssignDialogSiteId(siteId)
    setAssignDialogOpen(true)
  }, [])

  const handleAddWorker = useCallback((siteId: number) => {
    setAssignDialogSiteId(siteId)
    setAssignDialogOpen(true)
  }, [])

  // Find site data for dialog props
  const assignDialogSite = assignDialogSiteId
    ? filteredSites.find((s) => s.id === assignDialogSiteId) ?? sites?.find((s) => s.id === assignDialogSiteId)
    : null

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        viewMode="week"
        onPrev={() => setCurrentDate((d) => addWeeks(d, -1))}
        onNext={() => setCurrentDate((d) => addWeeks(d, 1))}
        onToday={() => setCurrentDate(new Date())}
        onViewChange={() => {}}
        showViewSwitch={false}
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-destructive">
          <AlertTriangle className="h-12 w-12" />
          <p>Erreur lors du chargement du planning</p>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <CalendarIcon className="h-12 w-12" />
          <p>Aucun chantier planifié cette semaine</p>
        </div>
      ) : isMobile ? (
        <GanttMobileView
          currentDate={currentDate}
          sites={filteredSites}
          onAssignmentClick={(a, siteId) => handleAssignmentClick(a, siteId)}
          onAddWorker={handleAddWorker}
        />
      ) : (
        <div className="overflow-x-auto border rounded-md" role="grid" aria-label="Vue Gantt du planning">
          <GanttTimeline
            weekStart={weekStart}
            totalColumns={totalColumns}
          />
          {filteredSites.map((site) => (
            <GanttSiteRow
              key={site.id}
              site={site}
              isExpanded={expandedSiteIds.has(site.id)}
              onToggle={() => toggleExpand(site.id)}
              totalColumns={totalColumns}
              weekStart={weekStart}
              workStartHour={GANTT_WORK_START}
              workEndHour={GANTT_WORK_END}
              onAssignmentClick={(a) => handleAssignmentClick(a)}
              onEmptySlotClick={handleEmptySlotClick}
              onAddWorker={handleAddWorker}
            />
          ))}
        </div>
      )}

      {/* Assign Worker Dialog */}
      {assignDialogSiteId && (
        <AssignWorkerDialog
          siteId={assignDialogSiteId}
          siteStartDate={assignDialogSite?.startDate ?? null}
          siteEndDate={assignDialogSite?.endDate ?? null}
          open={assignDialogOpen}
          onOpenChange={(open) => {
            setAssignDialogOpen(open)
            if (!open) setAssignDialogSiteId(null)
          }}
        />
      )}

      {/* Edit Assignment Dialog */}
      {editDialogAssignment && editDialogSiteId && (
        <EditAssignmentDialog
          siteId={editDialogSiteId}
          assignment={editDialogAssignment}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) {
              setEditDialogAssignment(null)
              setEditDialogSiteId(null)
            }
          }}
        />
      )}
    </div>
  )
}
