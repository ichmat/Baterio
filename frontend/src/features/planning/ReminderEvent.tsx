import { BellRing } from 'lucide-react'
import type { CalendarEvent } from './types'

interface ReminderEventProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
  compact?: boolean
}

export function ReminderEvent({ event, onClick, compact }: ReminderEventProps) {
  if (compact) {
    return (
      <button
        onClick={() => onClick(event)}
        className="flex w-full items-center gap-1 truncate rounded border-l-2 border-l-amber-500 bg-amber-50 px-1 text-[11px] cursor-pointer dark:bg-amber-900/30"
      >
        <BellRing className="h-3 w-3 shrink-0 text-amber-600" />
        {event.title}
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(event)}
      className="flex w-full items-center gap-1.5 overflow-hidden rounded border-l-3 border-l-amber-500 bg-amber-50 px-1.5 py-0.5 text-xs cursor-pointer dark:bg-amber-900/30"
    >
      <BellRing className="h-3.5 w-3.5 shrink-0 text-amber-600" />
      <span className="truncate font-medium">{event.title}</span>
    </button>
  )
}
