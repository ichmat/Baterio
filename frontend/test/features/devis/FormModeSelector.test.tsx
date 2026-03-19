import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormModeSelector } from '@/features/devis/FormModeSelector'
import { renderWithProviders } from '../../test-utils'

describe('FormModeSelector', () => {
  const onModeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche les 3 modes avec labels', () => {
    renderWithProviders(
      <FormModeSelector mode="libre" onModeChange={onModeChange} />,
    )

    expect(screen.getByText('Rapide')).toBeInTheDocument()
    expect(screen.getByText('Libre')).toBeInTheDocument()
    expect(screen.getByText('Complet')).toBeInTheDocument()
    expect(screen.getByText('Obligatoires seuls')).toBeInTheDocument()
    expect(screen.getByText('Tous les champs')).toBeInTheDocument()
    expect(screen.getByText('Tout + suggestions')).toBeInTheDocument()
  })

  it('le mode actif est visuellement distinct (aria-checked)', () => {
    renderWithProviders(
      <FormModeSelector mode="rapide" onModeChange={onModeChange} />,
    )

    const rapideBtn = screen.getByRole('radio', { name: /rapide/i })
    const libreBtn = screen.getByRole('radio', { name: /libre/i })
    expect(rapideBtn).toHaveAttribute('aria-checked', 'true')
    expect(libreBtn).toHaveAttribute('aria-checked', 'false')
  })

  it('changement de mode appelle onModeChange', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <FormModeSelector mode="libre" onModeChange={onModeChange} />,
    )

    await user.click(screen.getByText('Rapide'))
    expect(onModeChange).toHaveBeenCalledWith('rapide')

    await user.click(screen.getByText('Complet'))
    expect(onModeChange).toHaveBeenCalledWith('complet')
  })

  it('a le role radiogroup avec aria-label', () => {
    renderWithProviders(
      <FormModeSelector mode="libre" onModeChange={onModeChange} />,
    )

    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Mode de création')
  })
})

describe('useFormMode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retourne "libre" par défaut', async () => {
    const { useFormMode } = await import('@/features/devis/useFormMode')
    // Test via rendering
    const { result } = await import('@testing-library/react').then(({ renderHook }) =>
      renderHook(() => useFormMode()),
    )
    expect(result.current.mode).toBe('libre')
  })

  it('persiste le mode dans localStorage', async () => {
    const { useFormMode } = await import('@/features/devis/useFormMode')
    const { renderHook, act } = await import('@testing-library/react')

    const { result } = renderHook(() => useFormMode())

    act(() => {
      result.current.updateMode('complet')
    })

    expect(result.current.mode).toBe('complet')
    expect(localStorage.getItem('devis-form-mode')).toBe('complet')
  })

  it('restaure le mode depuis localStorage', async () => {
    localStorage.setItem('devis-form-mode', 'rapide')

    const { useFormMode } = await import('@/features/devis/useFormMode')
    const { renderHook } = await import('@testing-library/react')

    const { result } = renderHook(() => useFormMode())
    expect(result.current.mode).toBe('rapide')
  })
})
