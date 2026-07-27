import { describe, expect, it } from 'vitest'

import { createEmptyBoard } from '../domain/board.ts'
import { BOARD_SIZE, TOTAL_SHIP_CELLS } from '../domain/constants.ts'
import { allCoordinates, coordinateKey, formatCoordinate } from '../domain/coordinates.ts'
import { randomFleet } from '../domain/randomPlacement.ts'
import { seededRng, type Rng } from '../domain/rng.ts'
import { fireAt, isFleetDestroyed } from '../domain/shots.ts'
import { boardWith, fireAll, placement } from '../domain/testFixtures.ts'
import type { Board } from '../domain/types.ts'
import { opponentView } from '../domain/view.ts'
import { nextShot } from './aiPlayer.ts'

/** The AI's chosen square, expressed as a label so failures are readable. */
function shotLabelFor(board: Board, rng: Rng = seededRng(1)): string {
  return formatCoordinate(nextShot(opponentView(board), rng))
}

describe('hunting', () => {
  it('fires on the checkerboard, which cannot miss any ship', () => {
    // The shortest ship covers two adjacent squares, so it always covers a square where
    // (row + col) is even. Firing only at those halves the search with no blind spot.
    for (let seed = 0; seed < 200; seed += 1) {
      const coordinate = nextShot(opponentView(createEmptyBoard()), seededRng(seed))

      expect((coordinate.row + coordinate.col) % 2).toBe(0)
    }
  })

  it('keeps hunting on the checkerboard while every shot has missed', () => {
    const rng = seededRng(3)
    let board = createEmptyBoard()

    for (let shot = 0; shot < 30; shot += 1) {
      const coordinate = nextShot(opponentView(board), rng)

      expect((coordinate.row + coordinate.col) % 2).toBe(0)
      board = fireAt(board, coordinate).board
    }
  })

  it('falls back to the other half of the board once the pattern is exhausted', () => {
    const evenSquares = allCoordinates().filter(({ row, col }) => (row + col) % 2 === 0)
    const board = evenSquares.reduce(
      (current, coordinate) => fireAt(current, coordinate).board,
      createEmptyBoard(),
    )

    const coordinate = nextShot(opponentView(board), seededRng(1))

    expect((coordinate.row + coordinate.col) % 2).toBe(1)
  })

  it('never repeats a square, across a whole board of shots', () => {
    const rng = seededRng(5)
    let board = randomFleet(seededRng(2))

    for (let shot = 0; shot < BOARD_SIZE * BOARD_SIZE; shot += 1) {
      board = fireAt(board, nextShot(opponentView(board), rng)).board
    }

    expect(new Set(board.shots.map(coordinateKey)).size).toBe(BOARD_SIZE * BOARD_SIZE)
  })

  it('refuses to fire when the board is exhausted rather than looping', () => {
    const board = allCoordinates().reduce(
      (current, coordinate) => fireAt(current, coordinate).board,
      createEmptyBoard(),
    )

    expect(() => nextShot(opponentView(board), seededRng(1))).toThrow(/no squares left/)
  })
})

describe('targeting', () => {
  it('attacks a square adjacent to a fresh hit', () => {
    const board = fireAll(boardWith(placement('cruiser', 'D4', 'horizontal')), 'D4')

    expect(['C-4', 'E-4', 'D-3', 'D-5']).toContain(shotLabelFor(board))
  })

  it('probes only inwards when the hit is in a corner', () => {
    const board = fireAll(boardWith(placement('cruiser', 'A1', 'horizontal')), 'A1')

    expect(['A-2', 'B-1']).toContain(shotLabelFor(board))
  })

  it('follows the axis once two hits line up', () => {
    // Hits at D-4 and E-4 reveal a horizontal ship, so the next shot must be C-4 or F-4
    // rather than a square above or below.
    const board = fireAll(boardWith(placement('cruiser', 'D4', 'horizontal')), 'D4', 'E4')

    expect(['C-4', 'F-4']).toContain(shotLabelFor(board))
  })

  it('follows a vertical axis the same way', () => {
    const board = fireAll(boardWith(placement('cruiser', 'D4', 'vertical')), 'D4', 'D5')

    expect(['D-3', 'D-6']).toContain(shotLabelFor(board))
  })

  it('extends from the far end when one end is blocked by the board edge', () => {
    const board = fireAll(boardWith(placement('cruiser', 'A1', 'horizontal')), 'A1', 'B1')

    expect(shotLabelFor(board)).toBe('C-1')
  })

  it('extends from the far end when one end has already been fired at', () => {
    const board = fireAll(
      boardWith(placement('carrier', 'C5', 'horizontal')),
      'B5', // a miss, closing off that end
      'C5',
      'D5',
    )

    expect(shotLabelFor(board)).toBe('E-5')
  })

  it('stops chasing a ship once it has sunk and returns to hunting', () => {
    const board = fireAll(boardWith(placement('destroyer', 'D4', 'horizontal')), 'D4', 'E4')
    const coordinate = nextShot(opponentView(board), seededRng(1))

    // With the only ship sunk there is nothing to target, so the shot is a hunting shot.
    expect((coordinate.row + coordinate.col) % 2).toBe(0)
  })

  it('keeps working on a second damaged ship after the first one sinks', () => {
    const board = fireAll(
      boardWith(placement('destroyer', 'A1', 'horizontal'), placement('carrier', 'F5', 'vertical')),
      'F5', // hit the carrier
      'A1',
      'B1', // sink the destroyer
    )

    // The carrier is still damaged and unsunk, so the AI returns to it.
    expect(['F-4', 'F-6', 'E-5', 'G-5']).toContain(shotLabelFor(board))
  })

  it('is a pure function of the history: the same board always gives the same choice', () => {
    const board = fireAll(boardWith(placement('cruiser', 'D4', 'horizontal')), 'D4', 'E4')

    expect(shotLabelFor(board, seededRng(9))).toBe(shotLabelFor(board, seededRng(9)))
  })
})

describe('playing complete games', () => {
  const games = 500

  it('always sinks the whole fleet, over five hundred games', { timeout: 60_000 }, () => {
    // The most valuable test in the project: it proves the AI terminates, never repeats a
    // shot, and never gets stuck, across hundreds of different boards rather than one.
    let worstCase = 0
    let total = 0

    for (let seed = 0; seed < games; seed += 1) {
      const rng = seededRng(seed + 10_000)
      let board = randomFleet(seededRng(seed))
      let shots = 0

      while (!isFleetDestroyed(board)) {
        board = fireAt(board, nextShot(opponentView(board), rng)).board
        shots += 1

        expect(shots).toBeLessThanOrEqual(BOARD_SIZE * BOARD_SIZE)
      }

      expect(new Set(board.shots.map(coordinateKey)).size).toBe(shots)
      worstCase = Math.max(worstCase, shots)
      total += shots
    }

    const average = total / games
    // A competent but beatable opponent: far better than random (which averages ~95 shots)
    // and clearly worse than perfect play (17). These bounds are wide on purpose — they
    // catch an AI that has broken badly without failing on a tweak to its strategy.
    expect(average).toBeGreaterThan(TOTAL_SHIP_CELLS)
    expect(average).toBeLessThan(70)
    expect(worstCase).toBeLessThanOrEqual(BOARD_SIZE * BOARD_SIZE)
  })
})
