import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { PlanningCalendar } from '@/features/planning/PlanningCalendar'
import { PlanningFiltersPanel } from '@/features/planning/PlanningFiltersPanel'
import { usePlanningFilters } from '@/features/planning/usePlanningFilters'
import { GanttView } from '@/features/planning/GanttView'
import type { PlanningViewMode } from '@/features/planning/types'

const STORAGE_KEY = 'planning-view-mode'

function loadViewMode(): PlanningViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'gantt') return 'gantt'
  } catch {
    // ignore
  }
  return 'calendar'
}

export function PlanningPage() {
  const { filters, setFilters } = usePlanningFilters()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [viewMode, setViewMode] = useState<PlanningViewMode>(loadViewMode)

  const handleViewModeChange = (mode: PlanningViewMode) => {
    setViewMode(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h1 className="text-xl font-bold">Planning</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('calendar')}
              >
                Calendrier
              </Button>
              <Button
                variant={viewMode === 'gantt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('gantt')}
              >
                Gantt
              </Button>
            </div>
          )}
          <PlanningFiltersPanel filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>
      {viewMode === 'gantt' ? (
        <GanttView filters={filters} />
      ) : (
        <PlanningCalendar filters={filters} />
      )}
    </div>
  )
}
