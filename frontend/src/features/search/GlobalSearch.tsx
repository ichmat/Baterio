import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Users, FileText, Building2 } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { useDebounce } from '@/hooks/useDebounce'
import { useCustomerSearch } from '@/features/clients/useCustomerSearch'
import { useQuoteSearch } from '@/features/devis/useQuoteSearch'
import { STATUS_CONFIG } from '@/features/devis/status-config'
import { useSiteSearch } from '@/features/chantiers/useSites'
import { SITE_STATUS_CONFIG } from '@/features/chantiers/status-config'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const { data: customers, isLoading } = useCustomerSearch(debouncedQuery, 5)
  const { data: quotes, isLoading: quotesLoading } = useQuoteSearch(debouncedQuery, 5)
  const { data: sites, isLoading: sitesLoading } = useSiteSearch(debouncedQuery, 5)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleSelect = (customerId: number) => {
    navigate(`/clients/${customerId}`)
    onOpenChange(false)
    setQuery('')
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Recherche globale"
      description="Rechercher des clients, devis, chantiers..."
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Rechercher..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {(isLoading || quotesLoading || sitesLoading) && debouncedQuery.length >= 2
            ? 'Recherche en cours...'
            : 'Aucun résultat'}
        </CommandEmpty>
        {customers && customers.length > 0 && (
          <CommandGroup heading="Clients">
            {customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer-${c.id}`}
                onSelect={() => handleSelect(c.id)}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{c.lastName} {c.firstName}</span>
                {(c.telephone || c.email) && (
                  <span className="ml-auto text-sm text-muted-foreground">
                    {c.telephone || c.email}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {quotes && quotes.length > 0 && (
          <CommandGroup heading="Devis">
            {quotes.map((q) => {
              const statusCfg = STATUS_CONFIG[q.status] ?? STATUS_CONFIG.Draft
              const StatusIcon = statusCfg.icon
              return (
                <CommandItem
                  key={q.id}
                  value={`quote-${q.id}`}
                  onSelect={() => {
                    navigate(`/devis/${q.id}`)
                    onOpenChange(false)
                    setQuery('')
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>{q.reference}</span>
                  <span className="ml-1 text-muted-foreground">{q.customerName} — {q.subject}</span>
                  <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
        {sites && sites.length > 0 && (
          <CommandGroup heading="Chantiers">
            {sites.map((s) => {
              const statusCfg = SITE_STATUS_CONFIG[s.status] ?? SITE_STATUS_CONFIG.Planned
              const StatusIcon = statusCfg.icon
              return (
                <CommandItem
                  key={s.id}
                  value={`site-${s.id}`}
                  onSelect={() => {
                    navigate(`/chantiers/${s.id}`)
                    onOpenChange(false)
                    setQuery('')
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{s.reference}</span>
                  <span className="ml-1 text-muted-foreground">{s.customerName} — {s.siteAddress}</span>
                  <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
