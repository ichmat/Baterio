import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Building2, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { UserAvatar } from './user-avatar'
import { getWeekDays } from './calendar-utils'
import type { SiteCalendarEvent, SiteCalendarAssignment } from './types'

interface GanttMobileViewProps {
  currentDate: Date
  sites: SiteCalendarEvent[]
  onAssignmentClick: (assignment: SiteCalendarAssignment, siteId: number) => void
  onAddWorker: (siteId: number) => void
}

function formatSlot(a: SiteCalendarAssignment): string {
  if (!a.startDatetime || !a.endDatetime) return 'Toute la durée'
  return `${format(new Date(a.startDatetime), 'HH:mm')}–${format(new Date(a.endDatetime), 'HH:mm')}`
}

export function GanttMobileView({
  currentDate,
  sites,
  onAssignmentClick,
  onAddWorker,
}: GanttMobileViewProps) {
  const navigate = useNavigate()
  const days = getWeekDays(currentDate)

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        // Filter sites active on this day
        const daySites = sites.filter(
          (s) => s.startDate <= dayStr && s.endDate >= dayStr,
        )

        return (
          <div key={dayStr}>
            <h3 className="sticky top-0 bg-background px-2 py-1 text-sm font-semibold capitalize border-b">
              {format(day, 'EEEE d MMMM', { locale: fr })}
            </h3>
            {daySites.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                Aucun chantier
              </p>
            ) : (
              <div className="space-y-1 p-2">
                {daySites.map((site) => {
                  // Filter assignments relevant to this day
                  const dayAssignments = site.assignments.filter((a) => {
                    if (!a.startDatetime || !a.endDatetime) return true
                    const aStart = a.startDatetime.slice(0, 10)
                    const aEnd = a.endDatetime.slice(0, 10)
                    return aStart <= dayStr && aEnd >= dayStr
                  })

                  return (
                    <div
                      key={site.id}
                      className="rounded-md border p-2 space-y-1"
                    >
                      {/* Site header */}
                      <button
                        onClick={() => navigate(`/chantiers/${site.id}`)}
                        className="flex w-full items-center gap-2 text-left cursor-pointer hover:underline"
                      >
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {site.subject}
                        </span>
                      </button>

                      {/* Assignments list */}
                      {dayAssignments.length > 0 && (
                        <div className="ml-6 space-y-0.5">
                          {dayAssignments.map((a) => (
                              <button
                                key={a.id}
                                onClick={() => onAssignmentClick(a, site.id)}
                                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left cursor-pointer hover:bg-accent"
                              >
                                <UserAvatar
                                  assignment={a}
                                  size="sm"
                                />
                                <span className="text-xs truncate">
                                  {a.userFullName}
                                </span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatSlot(a)}
                                </span>
                              </button>
                          ))}
                        </div>
                      )}

                      {/* Add worker button */}
                      <div className="ml-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => onAddWorker(site.id)}
                          aria-label={`Ajouter un ouvrier à ${site.subject}`}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
