import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavbarProps {
  onSearchClick?: () => void
}

export function Navbar({ onSearchClick }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between border-b bg-background px-4 py-3">
      <span className="font-semibold">Batério</span>
      {onSearchClick && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={onSearchClick}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="pointer-events-none hidden select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-xs sm:inline">
            Ctrl+K
          </kbd>
        </Button>
      )}
    </nav>
  )
}
