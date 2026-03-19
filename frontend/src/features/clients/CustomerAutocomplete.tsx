import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Users, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useCustomerSearch } from './useCustomerSearch'
import type { CustomerSearchResult } from './types'

interface CustomerAutocompleteProps {
  value?: CustomerSearchResult | null
  onSelect: (customer: CustomerSearchResult) => void
  onCreateNew?: (query: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CustomerAutocomplete({
  value,
  onSelect,
  onCreateNew,
  placeholder = 'Rechercher un client...',
  disabled = false,
}: CustomerAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const debouncedQuery = useDebounce(inputValue, 300)
  const { data: customers, isLoading, isError } = useCustomerSearch(debouncedQuery)

  const displayValue = value ? `${value.lastName} ${value.firstName}` : ''

  const handleSelect = (customer: CustomerSearchResult) => {
    onSelect(customer)
    setInputValue('')
    setOpen(false)
  }

  const handleCreateNew = () => {
    onCreateNew?.(inputValue)
    setInputValue('')
    setOpen(false)
  }

  const formatInfo = (customer: CustomerSearchResult) => {
    const parts: string[] = []
    if (customer.quoteCount > 0) parts.push(`${customer.quoteCount} devis`)
    if (customer.siteCount > 0) parts.push(`${customer.siteCount} chantiers`)
    return parts.length > 0 ? parts.join(', ') : null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setOpen(true)}
        >
          <span className={displayValue ? '' : 'text-muted-foreground'}>
            {displayValue || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isError && (
              <CommandEmpty>Erreur de recherche</CommandEmpty>
            )}
            {!isError && isLoading && debouncedQuery.length >= 2 && (
              <CommandEmpty>Recherche en cours...</CommandEmpty>
            )}
            {!isError && !isLoading && debouncedQuery.length >= 2 && (!customers || customers.length === 0) && (
              <CommandEmpty>Aucun client trouvé</CommandEmpty>
            )}
            {customers && customers.length > 0 && (
              <CommandGroup>
                {customers.map((customer) => {
                  const info = formatInfo(customer)
                  return (
                    <CommandItem
                      key={customer.id}
                      value={String(customer.id)}
                      onSelect={() => handleSelect(customer)}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>{customer.lastName} {customer.firstName}</span>
                      {info && (
                        <span className="ml-auto text-xs text-muted-foreground">{info}</span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
            {onCreateNew && debouncedQuery.length >= 2 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Créer un nouveau client</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
