import type { ColumnDef } from '@tanstack/react-table'
import type { CustomerResponse } from './types'

export const customerColumns: ColumnDef<CustomerResponse, unknown>[] = [
  {
    accessorKey: 'lastName',
    header: 'Nom',
    enableSorting: true,
  },
  {
    accessorKey: 'firstName',
    header: 'Prénom',
    enableSorting: true,
  },
  {
    accessorKey: 'telephone',
    header: 'Téléphone',
    cell: ({ getValue }) => (getValue() as string) || '—',
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => (getValue() as string) || '—',
  },
]
