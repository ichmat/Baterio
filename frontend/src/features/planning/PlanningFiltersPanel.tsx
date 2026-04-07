import { Filter } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { PlanningFilters } from './types'

const SITE_STATUSES = [
  { key: 'Planned', label: 'Planifié' },
  { key: 'InProgress', label: 'En cours' },
  { key: 'Paused', label: 'Pause' },
  { key: 'Completed', label: 'Terminé' },
]

interface PlanningFiltersPanelProps {
  filters: PlanningFilters
  onFiltersChange: (update: Partial<PlanningFilters>) => void
}

export function PlanningFiltersPanel({ filters, onFiltersChange }: PlanningFiltersPanelProps) {
  function toggleStatus(status: string) {
    const current = filters.siteStatuses
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    onFiltersChange({ siteStatuses: next })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-1 h-4 w-4" />
          Filtres
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Afficher</p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-sites"
                checked={filters.showSites}
                onCheckedChange={(checked) =>
                  onFiltersChange({ showSites: checked === true })
                }
              />
              <Label htmlFor="show-sites" className="text-sm">
                Chantiers
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-reminders"
                checked={filters.showReminders}
                onCheckedChange={(checked) =>
                  onFiltersChange({ showReminders: checked === true })
                }
              />
              <Label htmlFor="show-reminders" className="text-sm">
                Rappels de devis
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <p className={`text-xs font-medium text-muted-foreground ${!filters.showSites ? 'opacity-50' : ''}`}>Statuts chantier</p>
            {SITE_STATUSES.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <Checkbox
                  id={`status-${s.key}`}
                  checked={filters.siteStatuses.includes(s.key)}
                  onCheckedChange={() => toggleStatus(s.key)}
                  disabled={!filters.showSites}
                />
                <Label htmlFor={`status-${s.key}`} className={`text-sm ${!filters.showSites ? 'opacity-50' : ''}`}>
                  {s.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
