import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { flexRender } from '@tanstack/react-table'
import { quoteColumns, defaultHiddenColumns } from '@/features/devis/columns'

/** Find column by accessorKey or id */
function findColumn(key: string) {
  return quoteColumns.find(
    (c) => c.id === key || ('accessorKey' in c && c.accessorKey === key),
  )!
}

/** Render a column cell with a given value */
function renderCell(key: string, value: unknown) {
  const col = findColumn(key)
  if (!col.cell || typeof col.cell === 'string') return null

  const mockCell = {
    getValue: () => value,
    row: { original: {} },
    column: { columnDef: col },
  }
  const rendered = flexRender(col.cell, mockCell as never)
  return render(<>{rendered}</>)
}

describe('quoteColumns', () => {
  it('contient les colonnes attendues', () => {
    const headers = quoteColumns.map((c) =>
      typeof c.header === 'string' ? c.header : c.id,
    )
    expect(headers).toEqual([
      'Référence',
      'Client',
      'Objet',
      'Statut',
      'Priorité',
      'Créé le',
      'Relance',
      'Montant HT',
      'Montant TTC',
    ])
  })

  it('toutes les colonnes ont enableSorting', () => {
    for (const col of quoteColumns) {
      expect(col.enableSorting).toBe(true)
    }
  })

  describe('badge statut', () => {
    it('affiche "Brouillon" pour Draft', () => {
      renderCell('status', 'Draft')
      expect(screen.getByText('Brouillon')).toBeInTheDocument()
    })

    it('affiche "Envoyé" pour Sent', () => {
      renderCell('status', 'Sent')
      expect(screen.getByText('Envoyé')).toBeInTheDocument()
    })

    it('affiche "Validé" pour Accepted', () => {
      renderCell('status', 'Accepted')
      expect(screen.getByText('Validé')).toBeInTheDocument()
    })

    it('affiche "Refusé" pour Refused', () => {
      renderCell('status', 'Refused')
      expect(screen.getByText('Refusé')).toBeInTheDocument()
    })

    it('fallback Draft pour statut inconnu', () => {
      renderCell('status', 'Unknown')
      expect(screen.getByText('Brouillon')).toBeInTheDocument()
    })
  })

  describe('badge priorité', () => {
    it('affiche "Haute" pour High', () => {
      renderCell('priority', 'High')
      expect(screen.getByText('Haute')).toBeInTheDocument()
    })

    it('affiche "Normale" pour Normal', () => {
      renderCell('priority', 'Normal')
      expect(screen.getByText('Normale')).toBeInTheDocument()
    })

    it('affiche "Basse" pour Low', () => {
      renderCell('priority', 'Low')
      expect(screen.getByText('Basse')).toBeInTheDocument()
    })
  })

  describe('dates formatées', () => {
    it('createdAt formatée en fr-FR', () => {
      renderCell('createdAt', '2026-03-15T10:00:00Z')
      expect(screen.getByText('15/03/2026')).toBeInTheDocument()
    })

    it('reminderDate formatée en fr-FR', () => {
      renderCell('reminderDate', '2026-04-01')
      expect(screen.getByText('01/04/2026')).toBeInTheDocument()
    })

    it('reminderDate null → tiret', () => {
      renderCell('reminderDate', null)
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('montants', () => {
    it('montant HT formaté avec Intl (€)', () => {
      renderCell('amountExclTax', 1500)
      expect(screen.getByText(/1[\s\u202f]500,00/)).toBeInTheDocument()
    })

    it('montant HT null → tiret', () => {
      renderCell('amountExclTax', null)
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('montant TTC formaté', () => {
      renderCell('amountInclTax', 2400.5)
      expect(screen.getByText(/2[\s\u202f]400,50/)).toBeInTheDocument()
    })
  })

  describe('objet tronqué', () => {
    it('texte affiché avec classe truncate', () => {
      renderCell('subject', 'Un objet très long pour tester la troncature')
      const el = screen.getByText('Un objet très long pour tester la troncature')
      expect(el).toHaveClass('truncate')
    })
  })
})

describe('defaultHiddenColumns', () => {
  it('masque uniquement amountExclTax et amountInclTax', () => {
    expect(defaultHiddenColumns).toEqual({
      amountExclTax: false,
      amountInclTax: false,
    })
  })

  it('ne masque PAS reference', () => {
    expect(defaultHiddenColumns).not.toHaveProperty('reference')
  })
})
