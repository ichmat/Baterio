import type { ColumnDef } from '@tanstack/react-table'
import type { QuoteListResponse } from './types'
import { STATUS_CONFIG, PRIORITY_CONFIG } from './status-config'
import { formatDate } from '@/lib/format-date'
import { formatMontant } from '@/lib/format-montant'

export const quoteColumns: ColumnDef<QuoteListResponse, unknown>[] = [
  {
    id: 'reference',
    accessorKey: 'reference',
    header: 'Référence',
    enableSorting: true,
  },
  {
    accessorKey: 'customerName',
    header: 'Client',
    enableSorting: true,
  },
  {
    accessorKey: 'subject',
    header: 'Objet',
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
      const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft
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
    accessorKey: 'priority',
    header: 'Priorité',
    enableSorting: true,
    cell: ({ getValue }) => {
      const priority = String(getValue() ?? '')
      const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.Normal
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${cfg.color}`}>
          {cfg.label}
        </span>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Créé le',
    enableSorting: true,
    cell: ({ getValue }) => formatDate(String(getValue() ?? '')),
  },
  {
    accessorKey: 'reminderDate',
    header: 'Relance',
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue()
      return val ? formatDate(String(val)) : '—'
    },
  },
  // Colonnes masquees par defaut (visibilite controlee par le selecteur)
  {
    id: 'amountExclTax',
    accessorKey: 'amountExclTax',
    header: 'Montant HT',
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue()
      return val != null ? formatMontant(Number(val)) : '—'
    },
  },
  {
    id: 'amountInclTax',
    accessorKey: 'amountInclTax',
    header: 'Montant TTC',
    enableSorting: true,
    cell: ({ getValue }) => {
      const val = getValue()
      return val != null ? formatMontant(Number(val)) : '—'
    },
  },
]

/** Colonnes masquees par defaut */
export const defaultHiddenColumns: Record<string, boolean> = {
  amountExclTax: false,
  amountInclTax: false,
}
