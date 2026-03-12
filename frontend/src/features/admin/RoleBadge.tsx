import { Badge } from '@/components/ui/badge'

const roleConfig: Record<string, { label: string; className: string }> = {
  Admin: { label: 'Admin', className: 'bg-violet-100 text-violet-800 hover:bg-violet-100' },
  Chef: { label: 'Chef', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  Secretaire: { label: 'Secrétaire', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  Ouvrier: { label: 'Ouvrier', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
}

interface RoleBadgeProps {
  role: string
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] ?? { label: role, className: '' }
  return <Badge className={config.className}>{config.label}</Badge>
}
