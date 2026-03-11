import { describe, it, expect } from 'vitest'
import { formatMontant } from '@/lib/format-montant'

describe('formatMontant', () => {
  it('formats amount in EUR with French locale', () => {
    const result = formatMontant(1234.56)
    // French locale uses non-breaking space as thousands separator
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
    expect(result).toContain('€')
  })

  it('formats zero correctly', () => {
    const result = formatMontant(0)
    expect(result).toContain('0')
    expect(result).toContain('€')
  })
})
