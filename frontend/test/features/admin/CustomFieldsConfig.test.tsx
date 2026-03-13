import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { CustomFieldsConfig } from '@/features/admin/CustomFieldsConfig'
import * as api from '@/features/admin/api'
import type { CustomFieldResponse } from '@/features/admin/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Select
let selectOnValueChange: ((v: string) => void) | null = null
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => {
    selectOnValueChange = onValueChange
    return <div>{children}</div>
  },
  SelectTrigger: ({ id, children }: { id?: string; children: React.ReactNode }) => <button type="button" id={id}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button type="button" data-testid={`select-item-${value}`} onClick={() => selectOnValueChange?.(value)}>{children}</button>
  ),
}))

const mockFields: CustomFieldResponse[] = [
  {
    id: 1,
    label: 'Surface m²',
    fieldType: 'Number',
    obligationLevel: 'Never',
    appliesToQuotes: true,
    appliesToSites: true,
    displayOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    label: 'Date debut',
    fieldType: 'Date',
    obligationLevel: 'RequiredForSiteConversion',
    appliesToQuotes: true,
    appliesToSites: false,
    displayOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CustomFieldsConfig', () => {
  it('renders two sections: Champs Devis and Champs Chantier', async () => {
    vi.mocked(api.getCustomFields).mockResolvedValue(mockFields)
    renderWithProviders(<CustomFieldsConfig />)

    await waitFor(() => {
      expect(screen.getByText('Champs Devis')).toBeInTheDocument()
      expect(screen.getByText('Champs Chantier')).toBeInTheDocument()
    })
  })

  it('shows field that applies to both in both sections', async () => {
    vi.mocked(api.getCustomFields).mockResolvedValue(mockFields)
    renderWithProviders(<CustomFieldsConfig />)

    await waitFor(() => {
      // Surface m² applies to both, so should appear in both sections
      const surfaceElements = screen.getAllByText('Surface m²')
      expect(surfaceElements).toHaveLength(2)
    })
  })

  it('shows quotes-only field only in Devis section', async () => {
    vi.mocked(api.getCustomFields).mockResolvedValue(mockFields)
    renderWithProviders(<CustomFieldsConfig />)

    await waitFor(() => {
      // "Date debut" applies only to quotes
      expect(screen.getByText('Date debut')).toBeInTheDocument()
    })
  })

  it('shows add buttons', async () => {
    vi.mocked(api.getCustomFields).mockResolvedValue(mockFields)
    renderWithProviders(<CustomFieldsConfig />)

    await waitFor(() => {
      const addButtons = screen.getAllByText('Ajouter un champ')
      expect(addButtons).toHaveLength(2)
    })
  })
})
