import type { ColumnDef } from '@tanstack/react-table'
import type { SiteResponse } from './types'
import { SITE_STATUS_CONFIG } from './status-config'
import { formatDate } from '@/lib/format-date'

export const siteColumns: ColumnDef<SiteResponse, unknown>[] = [
  {
    accessorKey: 'customerName',
    header: 'Client',
    enableSorting: true,
  },
  {
    accessorKey: 'siteAddress',
    header: 'Adresse',
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="max-w-[200px] truncate block">{String(getValue() ?? '')}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    enableSorting: true,
    cell: ({ getValue }) => {
      const status = String(getValue() ?? '')
      const cfg = SITE_STATUS_CONFIG[status] ?? SITE_STATUS_CONFIG.Planned
      const Icon = cfg.icon
      return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      )
    },
  },
  {
    id: 'workers',
    header: 'Ouvriers',
    cell: ({ row }) => {
      const info = row.original.assignedWorkers
      if (!info) return <span className="text-muted-foreground">-</span>
      if (info.count === 0) return <span className="text-muted-foreground">0 ouvrier</span>
      return (
        <span title={info.names.join(', ')} className="text-sm">
          {info.count} ouvrier{info.count > 1 ? 's' : ''}
        </span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: 'Créé le',
    enableSorting: true,
    cell: ({ getValue }) => formatDate(String(getValue() ?? '')),
  },
]
