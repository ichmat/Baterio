import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

export type CalendarViewMode = 'week' | 'month'

interface CalendarHeaderProps {
  currentDate: Date
  viewMode: CalendarViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (mode: CalendarViewMode) => void
  showViewSwitch?: boolean
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  showViewSwitch = true,
}: CalendarHeaderProps) {
  const title = (() => {
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { locale: fr, weekStartsOn: 1 })
      const we = endOfWeek(currentDate, { locale: fr, weekStartsOn: 1 })
      if (isSameMonth(ws, we)) {
        return `${format(ws, 'd', { locale: fr })} - ${format(we, 'd MMMM yyyy', { locale: fr })}`
      }
      return `${format(ws, 'd MMM', { locale: fr })} - ${format(we, 'd MMM yyyy', { locale: fr })}`
    }
    return format(currentDate, 'MMMM yyyy', { locale: fr })
  })()

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onPrev} aria-label="Période précédente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNext} aria-label="Période suivante">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Aujourd'hui
        </Button>
      </div>

      <h2 className="text-lg font-semibold capitalize">{title}</h2>

      {showViewSwitch && (
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            Semaine
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            Mois
          </Button>
        </div>
      )}
    </div>
  )
}
