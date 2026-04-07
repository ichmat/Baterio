import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { STATUS_COLORS } from './status-colors'
import type { SiteCalendarAssignment } from './types'

interface GanttAssignmentBarProps {
  assignment: SiteCalendarAssignment
  siteSubject: string
  siteStatus: string
  col: number
  span: number
  totalColumns: number
  isFullDuration: boolean
  onClick: () => void
}

export function GanttAssignmentBar({
  assignment,
  siteSubject,
  siteStatus,
  col,
  span,
  totalColumns,
  isFullDuration,
  onClick,
}: GanttAssignmentBarProps) {
  const colors = STATUS_COLORS[siteStatus] ?? STATUS_COLORS.Planned

  const timeLabel = isFullDuration
    ? 'Toute la durée'
    : assignment.startDatetime && assignment.endDatetime
      ? `${format(new Date(assignment.startDatetime), 'HH\'h\'mm', { locale: fr })}–${format(new Date(assignment.endDatetime), 'HH\'h\'mm', { locale: fr })}`
      : ''

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <button
          className={`absolute top-0.5 bottom-0.5 rounded px-1 text-xs font-medium truncate cursor-pointer border-l-2 ${colors.bg} ${colors.border} ${
            isFullDuration ? 'opacity-70' : ''
          }`}
          style={{
            left: `${((col - 1) / totalColumns) * 100}%`,
            width: `${(span / totalColumns) * 100}%`,
            ...(isFullDuration ? { backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)' } : {}),
          }}
          onClick={onClick}
          aria-label={`Attribution ${assignment.userFullName} — ${timeLabel}`}
        >
          <span className="truncate">{timeLabel}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm" side="top">
        <div className="space-y-1">
          <p className="font-semibold">{assignment.userFullName}</p>
          <p className="text-muted-foreground">{siteSubject}</p>
          {isFullDuration ? (
            <p className="text-muted-foreground italic">Toute la durée du chantier</p>
          ) : (
            assignment.startDatetime && assignment.endDatetime && (
              <p className="text-muted-foreground">
                {format(new Date(assignment.startDatetime), 'EEE d MMM HH:mm', { locale: fr })}
                {' → '}
                {format(new Date(assignment.endDatetime), 'EEE d MMM HH:mm', { locale: fr })}
              </p>
            )
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
