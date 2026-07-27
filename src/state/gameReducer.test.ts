import { describe, expect, it } from 'vitest'

import { isFleetComplete, occupiedCells } from '../domain/board.ts'
import { TOTAL_SHIP_CELLS } from '../domain/constants.ts'
import { allCoordinates, coordinateKey } from '../domain/coordinates.ts'
import { at } from '../domain/testFixtures.ts'
import { cellsForPlacement } from '../domain/board.ts'
import { seededRng } from '../domain/rng.ts'
import { isFleetDestroyed } from '../domain/shots.ts'
import type { Board, Coordinate } from '../domain/types.ts'
import { createGameReducer, initialPlacementState } from './gameReducer.ts'
import type { GameAction, GameState } from './gameState.ts'

const reduce = createGameReducer(seededRng(42))

function run(state: GameState, ...actions: readonly GameAction[]): GameState {
  return actions.reduce(reduce, state)
}

/** A game in progress with both fleets placed, ready for the player to fire. */
function startedGame(): GameState {
  return run(initialPlacementState(), { type: 'randomizeFleet' }, { type: 'startGame' })
}

/** Every square occupied by a ship on the given board. */
function shipCells(board: Board): Coordinate[] {
  return board.placements.flatMap(cellsForPlacement)
}

describe('placement', () => {
  it('starts with an empty board, the carrier selected and horizontal orientation', () => {
    const state = initialPlacementState()

    expect(state).toMatchObject({
      phase: 'placement',
      selectedShipId: 'carrier',
      orientation: 'horizontal',
    })
    expect(state.playerBoard.placements).toEqual([])
  })

  it('places the selected ship and moves the selection to the next unplaced ship', () => {
    const state = run(initialPlacementState(), { type: 'placeSelectedShip', origin: at('A1') })

    expect(state).toMatchObject({ phase: 'placement', selectedShipId: 'battleship' })
  })

  it('ignores an illegal placement rather than throwing or half-placing', () => {
    const before = initialPlacementState()
    const after = run(before, { type: 'placeSelectedShip', origin: at('G1') })

    expect(after).toEqual(before)
  })

  it('ignores a placement that overlaps a ship already on the board', () => {
    const withCarrier = run(initialPlacementState(), {
      type: 'placeSelectedShip',
      origin: at('A1'),
    })
    const after = run(withCarrier, { type: 'placeSelectedShip', origin: at('C1') })

    expect(after).toEqual(withCarrier)
  })

  it('toggles and sets orientation', () => {
    const toggled = run(initialPlacementState(), { type: 'toggleOrientation' })
    expect(toggled).toMatchObject({ orientation: 'vertical' })

    const back = run(toggled, { type: 'toggleOrientation' })
    expect(back).toMatchObject({ orientation: 'horizontal' })

    const set = run(back, { type: 'setOrientation', orientation: 'vertical' })
    expect(set).toMatchObject({ orientation: 'vertical' })
  })

  it('places a vertical ship when the orientation is vertical', () => {
    const state = run(
      initialPlacementState(),
      { type: 'setOrientation', orientation: 'vertical' },
      { type: 'placeSelectedShip', origin: at('A1') },
    )

    expect(state.playerBoard.placements[0]).toEqual({
      shipId: 'carrier',
      origin: at('A1'),
      orientation: 'vertical',
    })
  })

  it('removes a placed ship and selects it again so it can be repositioned', () => {
    const placed = run(initialPlacementState(), { type: 'placeSelectedShip', origin: at('A1') })
    const removed = run(placed, { type: 'removeShip', shipId: 'carrier' })

    expect(removed).toMatchObject({ selectedShipId: 'carrier' })
    expect(removed.playerBoard.placements).toEqual([])
  })

  it('randomises a complete, legal fleet', () => {
    const state = run(initialPlacementState(), { type: 'randomizeFleet' })

    expect(isFleetComplete(state.playerBoard)).toBe(true)
    expect(occupiedCells(state.playerBoard).size).toBe(TOTAL_SHIP_CELLS)
  })

  it('clears the fleet back to the starting state', () => {
    const state = run(initialPlacementState(), { type: 'randomizeFleet' }, { type: 'clearFleet' })

    expect(state).toEqual(initialPlacementState())
  })

  it('keeps the chosen orientation when the fleet is cleared', () => {
    const state = run(
      initialPlacementState(),
      { type: 'setOrientation', orientation: 'vertical' },
      { type: 'randomizeFleet' },
      { type: 'clearFleet' },
    )

    expect(state).toEqual({ ...initialPlacementState(), orientation: 'vertical' })
  })
})

describe('starting the game', () => {
  it('refuses to start until all five ships are placed', () => {
    const partial = run(initialPlacementState(), { type: 'placeSelectedShip', origin: at('A1') })

    expect(run(partial, { type: 'startGame' })).toEqual(partial)
  })

  it('places a legal AI fleet and gives the player the first turn', () => {
    const state = startedGame()

    expect(state.phase).toBe('playerTurn')
    if (state.phase !== 'playerTurn') return
    expect(occupiedCells(state.aiBoard).size).toBe(TOTAL_SHIP_CELLS)
    expect(state.log).toEqual([])
  })

  it('gives the two sides different fleets', () => {
    const state = startedGame()
    if (state.phase !== 'playerTurn') throw new Error('expected a started game')

    expect(state.aiBoard.placements).not.toEqual(state.playerBoard.placements)
  })
})

describe('firing', () => {
  it('records a miss and passes the turn to the AI', () => {
    const started = startedGame()
    if (started.phase !== 'playerTurn') throw new Error('expected a started game')

    const emptySquare = firstEmptySquare(started.aiBoard)
    const state = run(started, { type: 'playerFire', coordinate: emptySquare })

    expect(state.phase).toBe('aiTurn')
    expect(state).toMatchObject({ log: [{ shotNumber: 1, by: 'player', outcome: 'miss' }] })
  })

  it('records a hit and names the ship only when it sinks', () => {
    const started = startedGame()
    if (started.phase !== 'playerTurn') throw new Error('expected a started game')

    const target = shipCells(started.aiBoard)[0]
    if (!target) throw new Error('the AI fleet has no ships')

    const state = run(started, { type: 'playerFire', coordinate: target })

    expect(state).toMatchObject({ log: [{ outcome: 'hit' }] })
  })

  it('ignores a shot at a square already fired at, and does not waste the turn', () => {
    const started = startedGame()
    if (started.phase !== 'playerTurn') throw new Error('expected a started game')

    const square = firstEmptySquare(started.aiBoard)
    const afterFirst = run(started, { type: 'playerFire', coordinate: square })
    const afterAi = run(afterFirst, { type: 'aiFire' })
    const afterRepeat = run(afterAi, { type: 'playerFire', coordinate: square })

    expect(afterRepeat).toEqual(afterAi)
  })

  it('ignores a player shot while it is the AI turn', () => {
    const started = startedGame()
    if (started.phase !== 'playerTurn') throw new Error('expected a started game')

    const first = firstEmptySquare(started.aiBoard)
    const aiTurn = run(started, { type: 'playerFire', coordinate: first })
    const otherSquare = { row: first.row, col: (first.col + 1) % 10 }

    expect(run(aiTurn, { type: 'playerFire', coordinate: otherSquare })).toEqual(aiTurn)
  })

  it('ignores an AI shot while it is the player turn', () => {
    const started = startedGame()

    expect(run(started, { type: 'aiFire' })).toEqual(started)
  })

  it('never lets the AI fire at the same square twice over a full game', () => {
    const state = playToCompletion()
    const aiShots = state.log.filter((entry) => entry.by === 'ai')

    expect(
      new Set(aiShots.map((entry) => `${entry.coordinate.row},${entry.coordinate.col}`)).size,
    ).toBe(aiShots.length)
  })
})

describe('ending the game', () => {
  it('ends the moment the AI fleet is destroyed, with no reply shot', () => {
    const started = startedGame()
    if (started.phase !== 'playerTurn') throw new Error('expected a started game')

    // The player fires only at the AI's ships, so the game must end on the 17th shot with
    // the AI having had 16 turns and no chance to reply after losing.
    const targets = shipCells(started.aiBoard)
    let state: GameState = started
    for (const target of targets) {
      state = run(state, { type: 'playerFire', coordinate: target }, { type: 'aiFire' })
    }

    expect(state.phase).toBe('gameOver')
    if (state.phase !== 'gameOver') return
    expect(state.winner).toBe('player')
    expect(isFleetDestroyed(state.aiBoard)).toBe(true)
    expect(state.log.filter((entry) => entry.by === 'player')).toHaveLength(TOTAL_SHIP_CELLS)
    expect(state.log.filter((entry) => entry.by === 'ai')).toHaveLength(TOTAL_SHIP_CELLS - 1)
    expect(state.log.at(-1)).toMatchObject({ by: 'player', outcome: 'sunk' })
  })

  it('is not over one shot early', () => {
    const started = startedGame()
    if (started.phase !== 'playerTurn') throw new Error('expected a started game')

    const targets = shipCells(started.aiBoard)
    let state: GameState = started
    for (const target of targets.slice(0, -1)) {
      state = run(state, { type: 'playerFire', coordinate: target }, { type: 'aiFire' })
    }

    expect(state.phase).not.toBe('gameOver')
  })

  it('ignores every action once the game is over', () => {
    const finished = playToCompletion()
    const square = { row: 0, col: 0 }

    expect(run(finished, { type: 'playerFire', coordinate: square })).toEqual(finished)
    expect(run(finished, { type: 'aiFire' })).toEqual(finished)
    expect(run(finished, { type: 'randomizeFleet' })).toEqual(finished)
    expect(run(finished, { type: 'startGame' })).toEqual(finished)
  })

  it('returns to a fresh placement phase on a new game', () => {
    const finished = playToCompletion()

    expect(run(finished, { type: 'newGame' })).toEqual(initialPlacementState())
  })
})

describe('a whole game played automatically', () => {
  it('always reaches a single winner', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const state = playToCompletion(seed)

      expect(state.phase).toBe('gameOver')
      if (state.phase !== 'gameOver') continue
      expect(['player', 'ai']).toContain(state.winner)

      const loserBoard = state.winner === 'player' ? state.aiBoard : state.playerBoard
      const winnerBoard = state.winner === 'player' ? state.playerBoard : state.aiBoard
      expect(isFleetDestroyed(loserBoard)).toBe(true)
      expect(isFleetDestroyed(winnerBoard)).toBe(false)
    }
  })
})

/**
 * Plays a complete game. The player fires straight at the AI's ships, so the player wins
 * unless the AI happens to destroy the player's fleet first — either way the game must end.
 */
function playToCompletion(seed = 42): Extract<GameState, { phase: 'gameOver' }> {
  const reducer = createGameReducer(seededRng(seed))
  let state: GameState = [
    { type: 'randomizeFleet' } as const,
    { type: 'startGame' } as const,
  ].reduce<GameState>(reducer, initialPlacementState())
  if (state.phase !== 'playerTurn') throw new Error('expected a started game')

  const targets = shipCells(state.aiBoard)
  let nextTarget = 0

  while (state.phase !== 'gameOver') {
    if (state.phase === 'aiTurn') {
      state = reducer(state, { type: 'aiFire' })
      continue
    }

    const coordinate = targets[nextTarget]
    if (!coordinate) throw new Error('ran out of targets before the game ended')
    nextTarget += 1
    state = reducer(state, { type: 'playerFire', coordinate })
  }

  return state
}

function firstEmptySquare(board: Board): Coordinate {
  const occupied = occupiedCells(board)
  const empty = allCoordinates().find((coordinate) => !occupied.has(coordinateKey(coordinate)))
  if (!empty) throw new Error('the board is entirely covered in ships')
  return empty
}
