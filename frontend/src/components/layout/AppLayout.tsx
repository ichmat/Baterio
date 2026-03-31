import { useState, type ReactNode } from 'react'
import { GlobalSearch } from '@/features/search/GlobalSearch'
import { Navbar } from './Navbar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar onSearchClick={() => setSearchOpen(true)} />
      <main>{children}</main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
