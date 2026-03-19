import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useInfiniteAuditEvents } from './useInfiniteAuditEvents'
import { formatAuditAction, formatAuditDate } from './format-audit'
import { AuditPayloadDisplay } from './AuditPayloadDisplay'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface TimelineFullProps {
  entityType: string
  entityId: number
  entityLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TimelineFull({
  entityType,
  entityId,
  entityLabel,
  open,
  onOpenChange,
}: TimelineFullProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteAuditEvents(entityType, entityId, 20)
  const events = data?.pages.flatMap((page) => page.data) ?? []
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full! sm:max-w-xl! lg:max-w-3xl!">
        <SheetHeader>
          <SheetTitle>Historique — {entityLabel}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)] px-2">
          {isLoading ? (
            <div className="space-y-4 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full"/>
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun événement</p>
          ) : (
            <div role="feed" aria-label="Historique des événements" className="relative py-4">
              {isDesktop ? (
                /* Desktop: alternating timeline */
                <div className="relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border" />
                  {events.map((event, index) => {
                    const { label, icon: Icon } = formatAuditAction(event.action)
                    const isLeft = index % 2 === 0
                    return (
                      <div
                        key={event.id}
                        aria-label={`${label} par ${event.userFullName}`}
                        className={`relative mb-6 flex ${isLeft ? 'justify-start pr-[52%]' : 'justify-end pl-[52%]'}`}
                      >
                        <div className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background" />
                        <Card className="w-full">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {label}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.userFullName} — {formatAuditDate(event.createdAt)}
                            </p>
                            <AuditPayloadDisplay
                              payload={event.payload}
                              action={event.action}
                              entityType={entityType}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Mobile: stacked timeline */
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                  {events.map((event) => {
                    const { label, icon: Icon } = formatAuditAction(event.action)
                    return (
                      <div
                        key={event.id}
                        aria-label={`${label} par ${event.userFullName}`}
                        className="mb-4 relative"
                      >
                        <div className="absolute -left-5 top-3 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                        <Card>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              {label}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.userFullName} — {formatAuditDate(event.createdAt)}
                            </p>
                            <AuditPayloadDisplay
                              payload={event.payload}
                              action={event.action}
                              entityType={entityType}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              )}
              {hasNextPage && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
