import { Pencil, Send, Check, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatusConfig {
  label: string
  color: string
  icon: LucideIcon
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  Draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: Pencil },
  Sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700', icon: Send },
  Accepted: { label: 'Validé', color: 'bg-green-100 text-green-700', icon: Check },
  Refused: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: X },
}

export const PRIORITY_CONFIG: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Normal: 'bg-blue-100 text-blue-600',
  High: 'bg-orange-100 text-orange-600',
}
