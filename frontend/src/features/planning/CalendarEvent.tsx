import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { SITE_STATUS_CONFIG } from '@/features/chantiers/status-config'
import { STATUS_COLORS } from './status-colors'
import { UserAvatarStack } from './user-avatar'
import type { CalendarEvent as CalendarEventType } from './types'

interface CalendarEventProps {
  event: CalendarEventType
  onClick: (event: CalendarEventType) => void
  compact?: boolean
}

function TooltipContent({ event }: { event: CalendarEventType }) {
  return (
    <>
      <p className="font-medium">{event.customerName}</p>
      {event.siteAddress && (
        <p className="text-muted-foreground">{event.siteAddress}</p>
      )}
      {event.status && (
        <p className="mt-1">
          Statut : {SITE_STATUS_CONFIG[event.status]?.label ?? event.status}
        </p>
      )}
      {event.assignments && event.assignments.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">Ouvriers :</p>
          <ul className="text-xs">
            {event.assignments.map((a) => (
              <li key={a.userId}>{a.userFullName}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export function CalendarEventComponent({ event, onClick, compact }: CalendarEventProps) {
  const colors = STATUS_COLORS[event.status ?? ''] ?? STATUS_COLORS.Planned

  if (compact) {
    return (
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            onClick={() => onClick(event)}
            className={`w-full truncate rounded px-1 text-left text-[11px] cursor-pointer ${colors.bg} border-l-2 ${colors.border}`}
          >
            {event.title}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-64 text-sm" side="top">
          <TooltipContent event={event} />
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={() => onClick(event)}
          className={`flex w-full items-center gap-1 overflow-hidden rounded border-l-3 px-1.5 py-0.5 cursor-pointer ${colors.bg} ${colors.border}`}
        >
          <span className="truncate text-xs font-medium">{event.title}</span>
          <div className="ml-auto">
            <UserAvatarStack assignments={event.assignments ?? []} />
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm" side="top">
        <TooltipContent event={event} />
      </HoverCardContent>
    </HoverCard>
  )
}
