import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrowUpDown, ArrowUp, ArrowDown, Settings2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  searchPlaceholder?: string
  searchColumn?: string
  emptyMessage?: string
  onRowClick?: (row: T) => void
  selectedRowId?: number | string
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (visibility: VisibilityState) => void
  showColumnSelector?: boolean
  enableRowSelection?: boolean
  onExport?: (selectedRows: T[]) => void
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Rechercher...',
  searchColumn,
  emptyMessage = 'Aucun résultat.',
  onRowClick,
  selectedRowId,
  columnVisibility: externalColumnVisibility,
  onColumnVisibilityChange,
  showColumnSelector = false,
  enableRowSelection = false,
  onExport,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columnVisibility = externalColumnVisibility ?? internalColumnVisibility
  const handleColumnVisibilityChange = onColumnVisibilityChange ?? setInternalColumnVisibility

  const allColumns = useMemo(() => {
    if (!enableRowSelection) return columns

    const selectColumn: ColumnDef<T, unknown> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
    }
    return [selectColumn, ...columns]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      globalFilter: searchColumn ? undefined : globalFilter,
      columnFilters: searchColumn
        ? [{ id: searchColumn, value: globalFilter }]
        : undefined,
      columnVisibility,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
      handleColumnVisibilityChange(newVisibility)
    },
    ...(enableRowSelection
      ? { onRowSelectionChange: setRowSelection, enableRowSelection: true }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const selectedRows = enableRowSelection
    ? table.getSelectedRowModel().rows.map((r) => r.original)
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {showColumnSelector && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Sélecteur de colonnes">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              {table
                .getAllLeafColumns()
                .filter((c) => c.id !== 'select')
                .map((column) => (
                  <label key={column.id} className="flex items-center gap-2 py-1 text-sm">
                    <Checkbox
                      checked={column.getIsVisible()}
                      onCheckedChange={(v) => column.toggleVisibility(!!v)}
                    />
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id}
                  </label>
                ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {enableRowSelection && Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
          <span>{Object.keys(rowSelection).length} sélectionné(s)</span>
          {onExport && (
            <Button size="sm" variant="outline" onClick={() => onExport(selectedRows)}>
              <Download className="mr-2 h-4 w-4" /> Exporter Excel
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex cursor-pointer select-none items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            header.column.getToggleSortingHandler()?.(e)
                          }
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      <div>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    selectedRowId !== undefined &&
                      String((row.original as Record<string, unknown>)?.id) === String(selectedRowId) &&
                      'bg-accent',
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
