import { describe, it, expect } from 'vitest'
import { Trash2, Paperclip } from 'lucide-react'
import { formatAuditAction } from '@/features/audit/format-audit'

describe('formatAuditAction', () => {
  it('retourne "Fichier supprimé" avec icone Trash2 pour FileRemoved', () => {
    const result = formatAuditAction('FileRemoved')
    expect(result.label).toBe('Fichier supprimé')
    expect(result.icon).toBe(Trash2)
  })

  it('retourne "Fichier ajouté" pour FileAttached (inchange)', () => {
    const result = formatAuditAction('FileAttached')
    expect(result.label).toBe('Fichier ajouté')
    expect(result.icon).toBe(Paperclip)
  })
})
