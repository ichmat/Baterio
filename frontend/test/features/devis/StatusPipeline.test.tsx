import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { StatusPipeline } from '@/features/devis/StatusPipeline'
import { renderWithProviders } from '../../test-utils'

function getStepEl(key: string) {
  return screen.getByTestId(`step-${key}`)
}

describe('StatusPipeline', () => {
  it('Draft — Brouillon active (bleu), autres en gris', () => {
    renderWithProviders(<StatusPipeline currentStatus="Draft" />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Brouillon')

    expect(screen.getByText('Brouillon')).toBeInTheDocument()

    // Color assertions
    expect(getStepEl('Draft').className).toContain('text-blue-600')
    expect(getStepEl('Sent').className).toContain('text-gray-500')
    expect(getStepEl('Accepted').className).toContain('text-gray-500')
    expect(getStepEl('Refused').className).toContain('text-gray-500')
  })

  it('Sent — Brouillon passée (vert), Envoyé active (bleu), terminaux gris', () => {
    renderWithProviders(<StatusPipeline currentStatus="Sent" />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '1')
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Envoyé')

    expect(screen.getByText('Envoyé')).toBeInTheDocument()

    expect(getStepEl('Draft').className).toContain('text-green-600')
    expect(getStepEl('Sent').className).toContain('text-blue-600')
    expect(getStepEl('Accepted').className).toContain('text-gray-500')
    expect(getStepEl('Refused').className).toContain('text-gray-500')
  })

  it('Accepted — Brouillon/Envoyé passées (vert), Validé active (bleu), Refusé gris', () => {
    renderWithProviders(<StatusPipeline currentStatus="Accepted" />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '2')
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Validé')

    expect(screen.getByText('Validé')).toBeInTheDocument()

    expect(getStepEl('Draft').className).toContain('text-green-600')
    expect(getStepEl('Sent').className).toContain('text-green-600')
    expect(getStepEl('Accepted').className).toContain('text-blue-600')
    expect(getStepEl('Refused').className).toContain('text-gray-500')
  })

  it('Refused — Brouillon/Envoyé passées (vert), Validé gris, Refusé active (rouge)', () => {
    renderWithProviders(<StatusPipeline currentStatus="Refused" />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '3')
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Refusé')

    expect(screen.getByText('Refusé')).toBeInTheDocument()

    expect(getStepEl('Draft').className).toContain('text-green-600')
    expect(getStepEl('Sent').className).toContain('text-green-600')
    expect(getStepEl('Accepted').className).toContain('text-gray-500')
    expect(getStepEl('Refused').className).toContain('text-red-600')
  })

  it('affiche les 4 étapes avec le fork Validé/Refusé', () => {
    renderWithProviders(<StatusPipeline currentStatus="Sent" />)

    expect(screen.getByText('Envoyé')).toBeInTheDocument()
    expect(screen.getByText('Validé')).toBeInTheDocument()
    expect(screen.getByText('Refusé')).toBeInTheDocument()
  })

  it('accessibilité — role progressbar avec aria-valuemin et aria-valuemax', () => {
    renderWithProviders(<StatusPipeline currentStatus="Draft" />)

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '3')
  })
})
