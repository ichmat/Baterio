import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
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
  const title =
    viewMode === 'week'
      ? `Semaine du ${format(currentDate, 'd MMMM yyyy', { locale: fr })}`
      : format(currentDate, 'MMMM yyyy', { locale: fr })

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNext}>
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
