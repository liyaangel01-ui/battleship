import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { seededRng } from '../domain/rng.ts'
import { boardWith, placement } from '../domain/testFixtures.ts'
import { createGameReducer } from '../state/gameReducer.ts'
import type { GameAction, GameState, Player, StartedState } from '../state/gameState.ts'
import { BattleScreen } from './BattleScreen.tsx'

/** The opponent's pause is not what these tests are about, so it is turned down to nothing. */
const NO_PAUSE = 0

/** A fleet in the top-left corner, so a test knows exactly where every ship is. */
function fleet() {
  return boardWith(
    placement('carrier', 'A1', 'horizontal'),
    placement('battleship', 'A2', 'horizontal'),
    placement('cruiser', 'A3', 'horizontal'),
    placement('submarine', 'A4', 'horizontal'),
    placement('destroyer', 'A5', 'horizontal'),
  )
}

const playerTurn = (): StartedState => ({
  phase: 'playerTurn',
  playerBoard: fleet(),
  aiBoard: fleet(),
  log: [],
})

const aiTurn = (): StartedState => ({ ...playerTurn(), phase: 'aiTurn' })

const gameOver = (winner: Player): StartedState => ({ ...playerTurn(), phase: 'gameOver', winner })

/**
 * Renders the battle screen wired to the real reducer, so these tests play the actual game
 * rather than a mock of it: only the `useReducer` plumbing is stood in for.
 */
function renderGame(initial: StartedState = playerTurn()) {
  const reduce = createGameReducer(seededRng(7))
  let state: GameState = initial

  function screenFor(current: GameState) {
    return current.phase === 'placement' ? (
      <p>Back at placement</p>
    ) : (
      <BattleScreen state={current} dispatch={dispatch} aiDelayMs={NO_PAUSE} />
    )
  }

  function dispatch(action: GameAction) {
    state = reduce(state, action)
    view.rerender(screenFor(state))
  }

  const view = render(screenFor(initial))

  return {
    get state() {
      return state
    },
  }
}

/** Waits for the opponent's reply, which arrives on a timer rather than synchronously. */
async function opponentShoots() {
  await waitFor(() =>
    expect(
      screen.getByText('Your turn — pick a square in the opponent waters.'),
    ).toBeInTheDocument(),
  )
}

const opponentWaters = () => screen.getByRole('group', { name: 'Opponent waters' })

const opponentSquare = (label: string) =>
  within(opponentWaters()).getByRole('button', { name: new RegExp(`^${label},`) })

const user = userEvent.setup()

describe('BattleScreen', () => {
  it('reports a miss, then lets the opponent reply', async () => {
    renderGame()

    await user.click(opponentSquare('J-10'))
    expect(screen.getByText('You fired at J-10 — miss.')).toBeInTheDocument()

    await opponentShoots()

    expect(screen.getByText(/^The opponent (fired|hit|sank)/)).toBeInTheDocument()
  })

  it('reports a hit without revealing which ship was struck', async () => {
    renderGame()

    await user.click(opponentSquare('A-1'))
    await opponentShoots()

    expect(screen.getByText('You hit a ship at A-1.')).toBeInTheDocument()
    expect(within(opponentWaters()).queryByRole('button', { name: /Carrier/ })).toBeNull()
  })

  it('names the ship once it is sunk, and marks its squares', async () => {
    renderGame()

    await user.click(opponentSquare('A-5'))
    await opponentShoots()
    await user.click(opponentSquare('B-5'))

    expect(screen.getByText("You sank the opponent's Destroyer at B-5.")).toBeInTheDocument()
    expect(opponentSquare('A-5')).toHaveAccessibleName('A-5, Destroyer sunk')
  })

  it('refuses a second shot at a square already fired at', async () => {
    const game = renderGame()

    await user.click(opponentSquare('J-10'))
    await opponentShoots()

    expect(opponentSquare('J-10')).toBeDisabled()

    await user.click(opponentSquare('J-10'))

    expect(game.state.phase).toBe('playerTurn')
    expect(game.state.phase === 'placement' ? [] : game.state.aiBoard.shots).toHaveLength(1)
  })

  it('freezes the opponent grid while the opponent is aiming', () => {
    render(<BattleScreen state={aiTurn()} dispatch={vi.fn()} />)

    expect(screen.getByText('The opponent is taking aim…')).toBeInTheDocument()
    expect(opponentSquare('J-10')).toBeDisabled()
  })

  it('shows your own ships and hides the opponent’s', () => {
    renderGame()

    expect(
      within(screen.getByRole('group', { name: 'Your waters' })).getByRole('button', {
        name: 'A-1, your ship',
      }),
    ).toBeInTheDocument()
    expect(opponentSquare('A-1')).toHaveAccessibleName('A-1, not yet fired at')
  })

  it('counts the opponent fleet down as ships are sunk', async () => {
    renderGame()

    expect(screen.getAllByText('5 of 5 ships afloat')).toHaveLength(2)

    await user.click(opponentSquare('A-5'))
    await opponentShoots()
    await user.click(opponentSquare('B-5'))

    expect(screen.getByText('4 of 5 ships afloat')).toBeInTheDocument()
  })

  it('announces the win, reveals the enemy fleet and offers a new game', async () => {
    renderGame(gameOver('player'))

    expect(screen.getByText('You win — the enemy fleet is destroyed.')).toBeInTheDocument()
    expect(opponentSquare('A-1')).toHaveAccessibleName('A-1, your ship')

    await user.click(screen.getByRole('button', { name: 'Play again' }))

    expect(screen.getByText('Back at placement')).toBeInTheDocument()
  })

  it('announces a loss when the opponent finishes your fleet', () => {
    renderGame(gameOver('ai'))

    expect(screen.getByText('You lose — your fleet is gone.')).toBeInTheDocument()
  })

  it('cancels the opponent’s pending shot when the battle screen is left', async () => {
    // The opponent's shot is a pending timer. Leaving must cancel it, or it lands in whatever
    // game exists by the time it fires.
    const dispatch = vi.fn()
    const view = render(<BattleScreen state={aiTurn()} dispatch={dispatch} aiDelayMs={20} />)

    view.unmount()
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(dispatch).not.toHaveBeenCalled()
  })
})
