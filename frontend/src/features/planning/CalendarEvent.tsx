import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SITE_STATUS_CONFIG } from '@/features/chantiers/status-config'
import type { CalendarEvent as CalendarEventType } from './types'

interface CalendarEventProps {
  event: CalendarEventType
  onClick: (event: CalendarEventType) => void
  compact?: boolean
}

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  Planned: { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-l-blue-500' },
  InProgress: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-l-yellow-500' },
  Paused: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-l-gray-400' },
  Completed: { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-l-green-500' },
}

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function CalendarEventComponent({ event, onClick, compact }: CalendarEventProps) {
  const colors = STATUS_COLORS[event.status ?? ''] ?? STATUS_COLORS.Planned

  if (compact) {
    return (
      <button
        onClick={() => onClick(event)}
        className={`w-full truncate rounded px-1 text-left text-[11px] cursor-pointer ${colors.bg} border-l-2 ${colors.border}`}
      >
        {event.title}
      </button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={() => onClick(event)}
          className={`flex w-full items-center gap-1 overflow-hidden rounded border-l-3 px-1.5 py-0.5 cursor-pointer ${colors.bg} ${colors.border}`}
        >
          <span className="truncate text-xs font-medium">{event.title}</span>
          {event.assignments && event.assignments.length > 0 && (
            <div className="ml-auto flex -space-x-1">
              {event.assignments.slice(0, 3).map((a) => (
                <div
                  key={a.userId}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
                  title={a.userFullName}
                >
                  {a.userAvatarUrl ? (
                    <img
                      src={a.userAvatarUrl}
                      alt={a.userFullName}
                      className="h-5 w-5 rounded-full"
                    />
                  ) : (
                    getInitials(a.userFullName)
                  )}
                </div>
              ))}
              {event.assignments.length > 3 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                  +{event.assignments.length - 3}
                </span>
              )}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" side="top">
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
      </PopoverContent>
    </Popover>
  )
}
