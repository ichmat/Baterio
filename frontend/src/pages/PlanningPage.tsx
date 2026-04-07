import { Calendar } from 'lucide-react'
import { PlanningCalendar } from '@/features/planning/PlanningCalendar'
import { PlanningFiltersPanel } from '@/features/planning/PlanningFiltersPanel'
import { usePlanningFilters } from '@/features/planning/usePlanningFilters'

export function PlanningPage() {
  const { filters, setFilters } = usePlanningFilters()

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h1 className="text-xl font-bold">Planning</h1>
        </div>
        <PlanningFiltersPanel filters={filters} onFiltersChange={setFilters} />
      </div>
      <PlanningCalendar filters={filters} />
    </div>
  )
}
