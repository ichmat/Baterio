import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCustomers } from './useCustomers'
import { customerColumns } from './columns'
import { CreateClientDialog } from './CreateClientDialog'
import { ClientDetail } from './ClientDetail'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function ClientsPage() {
  const { data: customers, isLoading } = useCustomers()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  // Escape key to close split view
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedClientId !== null) {
        setSelectedClientId(null)
      }
    },
    [selectedClientId],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="h-9 w-36 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-64 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!customers?.length) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-4 text-lg text-muted-foreground">Aucun client</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer votre premier client
          </Button>
        </div>
        <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    )
  }

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold">Clients</h1>
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nouveau client
      </Button>
    </div>
  )

  const dataTable = (
    <DataTable
      columns={customerColumns}
      data={customers}
      searchPlaceholder="Rechercher un client..."
      selectedRowId={isDesktop ? (selectedClientId ?? undefined) : undefined}
      onRowClick={(customer) => {
        if (isDesktop) {
          setSelectedClientId(customer.id)
        } else {
          navigate(`/clients/${customer.id}`)
        }
      }}
    />
  )

  if (isDesktop && selectedClientId) {
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
              <ClientDetail customerId={selectedClientId} showBackButton={false} />
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
        <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {header}
      {dataTable}
      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
