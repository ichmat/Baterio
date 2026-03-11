import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('renders the homepage with Batério title', () => {
    render(<App />)
    expect(screen.getByText('Batério')).toBeInTheDocument()
  })

  it('renders the Commencer button', () => {
    render(<App />)
    expect(screen.getByText('Commencer')).toBeInTheDocument()
  })
})
