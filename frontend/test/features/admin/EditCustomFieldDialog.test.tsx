import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditCustomFieldDialog } from '@/features/admin/EditCustomFieldDialog'
import * as api from '@/features/admin/api'
import { toast } from 'sonner'
import type { CustomFieldResponse } from '@/features/admin/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/admin/api')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

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

const mockField: CustomFieldResponse = {
  id: 1,
  label: 'Surface m²',
  fieldType: 'Number',
  obligationLevel: 'Never',
  appliesToQuotes: true,
  appliesToSites: true,
  displayOrder: 0,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockOnOpenChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EditCustomFieldDialog', () => {
  it('pre-fills form with existing values', () => {
    renderWithProviders(
      <EditCustomFieldDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        field={mockField}
      />,
    )

    expect(screen.getByDisplayValue('Surface m²')).toBeInTheDocument()
  })

  it('shows field type as read-only', () => {
    renderWithProviders(
      <EditCustomFieldDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        field={mockField}
      />,
    )

    expect(screen.getByDisplayValue('Nombre')).toBeInTheDocument()
    expect(screen.getByText('Le type ne peut pas être modifié après création')).toBeInTheDocument()
  })

  it('submits update and shows toast', async () => {
    vi.mocked(api.updateCustomField).mockResolvedValue({
      ...mockField,
      label: 'Surface totale m²',
    })
    const user = userEvent.setup()

    renderWithProviders(
      <EditCustomFieldDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        field={mockField}
      />,
    )

    const input = screen.getByDisplayValue('Surface m²')
    await user.clear(input)
    await user.type(input, 'Surface totale m²')
    await user.click(screen.getByText('Enregistrer'))

    await waitFor(() => {
      expect(api.updateCustomField).toHaveBeenCalledWith(1, expect.objectContaining({
        label: 'Surface totale m²',
      }))
      expect(toast.success).toHaveBeenCalledWith('Champ mis à jour')
    })
  })
})
