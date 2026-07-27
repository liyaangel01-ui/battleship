import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { App } from './App.tsx'

const square = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label},`) })

describe('moving around the board with the keyboard', () => {
  it('walks the grid with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)

    square('A-1').focus()

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}')
    expect(square('C-2')).toHaveFocus()

    await user.keyboard('{ArrowLeft}{ArrowUp}')
    expect(square('B-1')).toHaveFocus()
  })

  it('stays on the board at the edges', async () => {
    const user = userEvent.setup()
    render(<App />)

    square('A-1').focus()

    await user.keyboard('{ArrowUp}{ArrowLeft}')
    expect(square('A-1')).toHaveFocus()
  })

  it('skips squares that have already been fired at', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Random fleet' }))
    await user.click(screen.getByRole('button', { name: 'Start battle' }))

    const opponentWaters = screen.getByRole('group', { name: 'Opponent waters' })
    const opponent = (label: string) =>
      screen
        .getAllByRole('button', { name: new RegExp(`^${label},`) })
        .filter((button) => opponentWaters.contains(button))[0]!

    await user.click(opponent('B-1'))
    await waitFor(() =>
      expect(
        screen.getByText('Your turn — pick a square in the opponent waters.'),
      ).toBeInTheDocument(),
    )

    opponent('A-1').focus()
    await user.keyboard('{ArrowRight}')

    expect(opponent('C-1')).toHaveFocus()
  })
})

describe('coming back to a game', () => {
  it('restores a game in progress after the page is reloaded', async () => {
    const user = userEvent.setup()
    const first = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Random fleet' }))
    await user.click(screen.getByRole('button', { name: 'Start battle' }))
    const fleetBefore = screen
      .getAllByRole('button', { name: /your ship/ })
      .map((ship) => ship.getAttribute('aria-label'))

    first.unmount()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Opponent waters' })).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button', { name: /your ship/ })
        .map((ship) => ship.getAttribute('aria-label')),
    ).toEqual(fleetBefore)
  })

  it('starts fresh when the browser has nothing saved', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Start battle' })).toBeDisabled()
  })
})
