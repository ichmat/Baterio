import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/ui/data-table'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useQuotes } from './useDevis'
import { quoteColumns, defaultHiddenColumns } from './columns'
import { DevisDetailPage } from './DevisDetailPage'
import { exportToXlsx } from '@/lib/export-xlsx'
import type { QuoteListResponse } from './types'
import type { VisibilityState } from '@tanstack/react-table'

const COLUMN_VISIBILITY_KEY = 'devis-column-visibility'
const MAX_QUOTES_LOAD = 500

function loadColumnVisibility(): VisibilityState {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // corrupted data — ignore
  }
  return defaultHiddenColumns
}

export function DevisPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuotes(1, MAX_QUOTES_LOAD)
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(loadColumnVisibility)

  function handleColumnVisibilityChange(visibility: VisibilityState) {
    setColumnVisibility(visibility)
    try {
      localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(visibility))
    } catch {
      // storage full or unavailable — ignore
    }
  }

  // Escape key to close split view (skip if already handled by Popover/Dialog)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedQuoteId !== null && !e.defaultPrevented) {
        setSelectedQuoteId(null)
      }
    },
    [selectedQuoteId],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleExport(rows: QuoteListResponse[]) {
    const visibleCols = quoteColumns
      .filter((c) => {
        const key = c.id ?? ('accessorKey' in c ? (c.accessorKey as string) : undefined)
        return key ? columnVisibility[key] !== false : true
      })
      .filter((c) => c.id !== 'select')
      .map((c) => ({
        key: ('accessorKey' in c ? (c.accessorKey as string) : c.id) ?? c.id!,
        header: typeof c.header === 'string' ? c.header : c.id!,
      }))
    await exportToXlsx(rows as unknown as Record<string, unknown>[], visibleCols, `devis-export-${new Date().toISOString().slice(0, 10)}`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
          <Skeleton className="h-9 w-64" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const quotes = data?.data ?? []
  const totalItems = data?.pagination?.totalItems ?? 0

  if (quotes.length === 0) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-4 text-lg text-muted-foreground">Aucun devis pour le moment</p>
          <Button onClick={() => navigate('/devis/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Button>
        </div>
      </div>
    )
  }

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Devis</h1>
      <div className="flex items-center gap-2">
        {totalItems > MAX_QUOTES_LOAD && (
          <span className="text-sm text-muted-foreground">
            Affichage limité à {MAX_QUOTES_LOAD} devis sur {totalItems}
          </span>
        )}
        <Button onClick={() => navigate('/devis/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
      </div>
    </div>
  )

  const dataTable = (
    <DataTable
      columns={quoteColumns}
      data={quotes}
      searchPlaceholder="Rechercher un devis..."
      selectedRowId={isDesktop ? (selectedQuoteId ?? undefined) : undefined}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={handleColumnVisibilityChange}
      showColumnSelector
      enableRowSelection
      onExport={handleExport}
      onRowClick={(quote) => {
        if (isDesktop) {
          setSelectedQuoteId(quote.id)
        } else {
          navigate(`/devis/${quote.id}`)
        }
      }}
    />
  )

  if (isDesktop && selectedQuoteId) {
    return (
      <div className="container mx-auto py-6 px-4">
        {header}
        <ResizablePanelGroup key="split">
          <ResizablePanel defaultSize={40} minSize={30}>
            {dataTable}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={40}>
            <ScrollArea className="h-[calc(100vh-10rem)]">
              <DevisDetailPage quoteId={selectedQuoteId} showBackButton={false} />
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {header}
      {dataTable}
    </div>
  )
}
