import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

export interface EntityLink {
  label: string
  href: string
  icon: LucideIcon
}

interface EntityLinksBarProps {
  links: EntityLink[]
}

export function EntityLinksBar({ links }: EntityLinksBarProps) {
  if (links.length === 0) return null

  return (
    <nav role="navigation" aria-label="Entités liées" className="flex flex-col md:flex-row gap-2">
      {links.map((link) => (
        <Button key={link.href} variant="outline" size="sm" asChild>
          <Link to={link.href}>
            <link.icon className="mr-2 h-4 w-4" />
            {link.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
