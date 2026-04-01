import { Calendar, Play, Pause, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PipelineConfig } from '../devis/StatusPipeline'

interface StatusConfig {
  label: string
  color: string
  icon: LucideIcon
}

export const SITE_STATUS_CONFIG: Record<string, StatusConfig> = {
  Planned: { label: 'Planifié', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  InProgress: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: Play },
  Paused: { label: 'Pause', color: 'bg-gray-100 text-gray-700', icon: Pause },
  Completed: { label: 'Terminé', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
}

export const SITE_PIPELINE_CONFIG: PipelineConfig = {
  linearSteps: [
    { key: 'Planned', label: 'Planifié', icon: Calendar },
    { key: 'Paused', label: 'Pause', icon: Pause },
    { key: 'InProgress', label: 'En cours', icon: Play },
    { key: 'Completed', label: 'Terminé', icon: CheckCircle2 },
  ],
  terminalSteps: {},
}
