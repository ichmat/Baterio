import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerAutocomplete } from '@/features/clients/CustomerAutocomplete'
import * as api from '@/features/clients/api'
import type { CustomerSearchResult } from '@/features/clients/types'
import { renderWithProviders } from '../../test-utils'

vi.mock('@/features/clients/api')

const mockResults: CustomerSearchResult[] = [
  { id: 1, lastName: 'Lefebvre', firstName: 'Marie', telephone: '0601020304', email: 'marie@test.fr', quoteCount: 0, siteCount: 0 },
  { id: 2, lastName: 'Lefranc', firstName: 'Pierre', telephone: null, email: null, quoteCount: 2, siteCount: 1 },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CustomerAutocomplete', () => {
  it('does not send request with less than 2 characters', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<CustomerAutocomplete onSelect={onSelect} />)

    // Open the popover
    await userEvent.click(screen.getByRole('combobox'))

    // Type one character
    const input = screen.getByPlaceholderText('Rechercher un client...')
    await userEvent.type(input, 'L')

    // Wait for debounce to pass, then verify API was never called
    await waitFor(() => {
      expect(api.searchCustomers).not.toHaveBeenCalled()
    }, { timeout: 500 })
  })

  it('displays results after typing 2+ characters', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue(mockResults)
    const onSelect = vi.fn()
    renderWithProviders(<CustomerAutocomplete onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('combobox'))
    const input = screen.getByPlaceholderText('Rechercher un client...')
    await userEvent.type(input, 'Lef')

    await waitFor(() => {
      expect(screen.getByText('Lefebvre Marie')).toBeInTheDocument()
      expect(screen.getByText('Lefranc Pierre')).toBeInTheDocument()
    })
  })

  it('calls onSelect when a result is clicked', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue(mockResults)
    const onSelect = vi.fn()
    renderWithProviders(<CustomerAutocomplete onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('combobox'))
    const input = screen.getByPlaceholderText('Rechercher un client...')
    await userEvent.type(input, 'Lef')

    await waitFor(() => {
      expect(screen.getByText('Lefebvre Marie')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Lefebvre Marie'))

    expect(onSelect).toHaveBeenCalledWith(mockResults[0])
  })

  it('shows "Créer un nouveau client" when no results and onCreateNew provided', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue([])
    const onSelect = vi.fn()
    const onCreateNew = vi.fn()
    renderWithProviders(
      <CustomerAutocomplete onSelect={onSelect} onCreateNew={onCreateNew} />
    )

    await userEvent.click(screen.getByRole('combobox'))
    const input = screen.getByPlaceholderText('Rechercher un client...')
    await userEvent.type(input, 'Xyz')

    await waitFor(() => {
      expect(screen.getByText('Créer un nouveau client')).toBeInTheDocument()
    })
  })

  it('calls onCreateNew when create option is clicked', async () => {
    vi.mocked(api.searchCustomers).mockResolvedValue([])
    const onSelect = vi.fn()
    const onCreateNew = vi.fn()
    renderWithProviders(
      <CustomerAutocomplete onSelect={onSelect} onCreateNew={onCreateNew} />
    )

    await userEvent.click(screen.getByRole('combobox'))
    const input = screen.getByPlaceholderText('Rechercher un client...')
    await userEvent.type(input, 'NouveauClient')

    await waitFor(() => {
      expect(screen.getByText('Créer un nouveau client')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Créer un nouveau client'))

    expect(onCreateNew).toHaveBeenCalledWith('NouveauClient')
  })
})
