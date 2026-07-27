import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { App } from './App.tsx'

/** The square with the given label, e.g. "A-1", on the player's grid. */
function square(label: string) {
  return screen.getByRole('button', { name: new RegExp(`^${label},`) })
}

function placedShipSquares(): HTMLElement[] {
  return screen
    .getAllByRole('button')
    .filter((button) => /click to remove$/.test(button.getAttribute('aria-label') ?? ''))
}

describe('placing a fleet', () => {
  it('places the selected ship where the player clicks, then selects the next ship', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(square('A-1'))

    // The carrier is five squares long, so A-1 to E-1 are now occupied.
    expect(placedShipSquares()).toHaveLength(5)
    expect(square('A-1')).toHaveAccessibleName('A-1, Carrier — click to remove')
    expect(screen.getByRole('button', { name: /^Battleship/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('places vertically when the orientation is switched', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'vertical' }))
    await user.click(square('A-1'))

    expect(square('A-5')).toHaveAccessibleName('A-5, Carrier — click to remove')
    expect(square('E-1')).toHaveAccessibleName('E-1, empty water')
  })

  it('refuses a placement that would run off the edge of the grid', async () => {
    const user = userEvent.setup()
    render(<App />)

    // The carrier needs five columns, so it cannot start at G.
    await user.click(square('G-1'))

    expect(placedShipSquares()).toHaveLength(0)
  })

  it('refuses a placement that overlaps a ship already on the grid', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(square('C-1')) // carrier across C-1..G-1
    // The battleship would run A-1..D-1, and D-1 belongs to the carrier. The origin itself is
    // empty water, so only the ship's full length reveals the overlap.
    await user.click(square('A-1'))

    expect(placedShipSquares()).toHaveLength(5)
  })

  it('removes a ship when its square is clicked, so it can be repositioned', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(square('A-1'))
    await user.click(square('C-1'))

    expect(placedShipSquares()).toHaveLength(0)
    expect(screen.getByRole('button', { name: /^Carrier/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('removes a ship from the fleet list too', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(square('A-1'))
    await user.click(screen.getByRole('button', { name: 'Remove Carrier' }))

    expect(placedShipSquares()).toHaveLength(0)
  })

  it('lets the player pick a specific ship out of order', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Destroyer/ }))
    await user.click(square('A-1'))

    // The destroyer is two squares long.
    expect(placedShipSquares()).toHaveLength(2)
  })
})

describe('the setup controls', () => {
  it('cannot start the battle until all five ships are placed', async () => {
    const user = userEvent.setup()
    render(<App />)

    const start = screen.getByRole('button', { name: 'Start battle' })
    expect(start).toBeDisabled()

    await user.click(square('A-1'))
    expect(start).toBeDisabled()
  })

  it('fills the grid with a legal fleet when the player asks for a random one', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Random fleet' }))

    // Seventeen squares of ships, and every ship shown as placed in the roster.
    expect(placedShipSquares()).toHaveLength(17)
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Start battle' })).toBeEnabled()
  })

  it('clears the grid back to empty water', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Random fleet' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(placedShipSquares()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Start battle' })).toBeDisabled()
  })

  it('starts the battle once the fleet is complete', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Random fleet' }))
    await user.click(screen.getByRole('button', { name: 'Start battle' }))

    expect(screen.getByRole('heading', { name: 'Opponent waters' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your waters' })).toBeInTheDocument()
    expect(
      screen.getByText('Your turn — pick a square in the opponent waters.'),
    ).toBeInTheDocument()
  })

  it('labels the grid and its squares for screen readers', () => {
    render(<App />)

    const grid = screen.getByRole('group', { name: 'Your waters' })

    expect(within(grid).getAllByRole('button')).toHaveLength(100)
    expect(within(grid).getByRole('button', { name: 'J-10, empty water' })).toBeInTheDocument()
  })
})
