import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSite, getSiteById, searchSites } from '@/features/chantiers/api'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('chantiers/api', () => {
  it('createSite — POST /sites avec le body correct', async () => {
    const mockResponse = { data: { id: 1, reference: 'CH-2026-001' } }
    vi.mocked(apiClient).mockResolvedValue(mockResponse)

    const payload = {
      customerId: 1,
      subject: 'Rénovation cuisine',
      siteAddress: '12 rue de Paris',
    }
    const result = await createSite(payload)

    expect(apiClient).toHaveBeenCalledWith('/sites', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    expect(result).toEqual(mockResponse.data)
  })

  it('getSiteById — GET /sites/:id', async () => {
    const mockResponse = { data: { id: 5, reference: 'CH-2026-005' } }
    vi.mocked(apiClient).mockResolvedValue(mockResponse)

    const result = await getSiteById(5)

    expect(apiClient).toHaveBeenCalledWith('/sites/5')
    expect(result).toEqual(mockResponse.data)
  })

  it('searchSites — GET /sites/search avec query et limit', async () => {
    const mockResponse = { data: [{ id: 1, reference: 'CH-2026-001' }] }
    vi.mocked(apiClient).mockResolvedValue(mockResponse)

    const result = await searchSites('cuisine', 5)

    expect(apiClient).toHaveBeenCalledWith('/sites/search?q=cuisine&limit=5')
    expect(result).toEqual(mockResponse.data)
  })

  it('searchSites — encode les caractères spéciaux dans la query', async () => {
    const mockResponse = { data: [] }
    vi.mocked(apiClient).mockResolvedValue(mockResponse)

    await searchSites('rue de la paix', 10)

    expect(apiClient).toHaveBeenCalledWith('/sites/search?q=rue%20de%20la%20paix&limit=10')
  })
})
