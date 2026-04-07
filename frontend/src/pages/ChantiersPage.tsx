import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/ui/data-table'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSites } from '@/features/chantiers/useSites'
import { siteColumns } from '@/features/chantiers/columns'
import { ChantierDetailPage } from '@/features/chantiers/ChantierDetailPage'
import { exportToXlsx } from '@/lib/export-xlsx'
import type { SiteResponse } from '@/features/chantiers/types'
import type { VisibilityState } from '@tanstack/react-table'

const COLUMN_VISIBILITY_KEY = 'chantiers-column-visibility'
const MAX_SITES_LOAD = 500

function loadColumnVisibility(): VisibilityState {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // corrupted data — ignore
  }
  return {}
}

export function ChantiersPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useSites(1, MAX_SITES_LOAD)
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSiteId !== null && !e.defaultPrevented) {
        setSelectedSiteId(null)
      }
    },
    [selectedSiteId],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleExport(rows: SiteResponse[]) {
    const visibleCols = siteColumns
      .filter((c) => {
        const key = c.id ?? ('accessorKey' in c ? (c.accessorKey as string) : undefined)
        return key ? columnVisibility[key] !== false : true
      })
      .filter((c) => c.id !== 'select' && c.id !== 'workers')
      .map((c) => ({
        key: ('accessorKey' in c ? (c.accessorKey as string) : c.id) ?? c.id!,
        header: typeof c.header === 'string' ? c.header : c.id!,
      }))
    await exportToXlsx(rows as unknown as Record<string, unknown>[], visibleCols, `chantiers-export-${new Date().toISOString().slice(0, 10)}`)
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

  const sites = data?.data ?? []
  const totalItems = data?.pagination?.totalItems ?? 0

  if (sites.length === 0) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground opacity-40" />
          <p className="mb-4 text-lg text-muted-foreground">Aucun chantier pour le moment</p>
          <Button onClick={() => navigate('/chantiers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau chantier
          </Button>
        </div>
      </div>
    )
  }

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Chantiers</h1>
      </div>
      <div className="flex items-center gap-2">
        {totalItems > MAX_SITES_LOAD && (
          <span className="text-sm text-muted-foreground">
            Affichage limité à {MAX_SITES_LOAD} chantiers sur {totalItems}
          </span>
        )}
        <Button onClick={() => navigate('/chantiers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau chantier
        </Button>
      </div>
    </div>
  )

  const dataTable = (
    <DataTable
      columns={siteColumns}
      data={sites}
      searchPlaceholder="Rechercher un chantier..."
      selectedRowId={isDesktop ? (selectedSiteId ?? undefined) : undefined}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={handleColumnVisibilityChange}
      showColumnSelector
      enableRowSelection
      onExport={handleExport}
      onRowClick={(site) => {
        if (isDesktop) {
          setSelectedSiteId(site.id)
        } else {
          navigate(`/chantiers/${site.id}`)
        }
      }}
    />
  )

  if (isDesktop && selectedSiteId) {
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
              <ChantierDetailPage siteId={selectedSiteId} showBackButton={false} />
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
