import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Users } from 'lucide-react'
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

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const { data: customers, isLoading } = useCustomerSearch(debouncedQuery, 5)
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
    >
      <CommandInput
        placeholder="Rechercher..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading && debouncedQuery.length >= 2
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
      </CommandList>
    </CommandDialog>
  )
}
