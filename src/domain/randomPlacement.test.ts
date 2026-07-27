import { describe, expect, it } from 'vitest'

import { canPlace, occupiedCells, removeShip } from './board.ts'
import { BOARD_SIZE, FLEET, TOTAL_SHIP_CELLS } from './constants.ts'
import { isInsideBoard } from './coordinates.ts'
import { cellsForPlacement } from './board.ts'
import { legalPlacements, randomFleet } from './randomPlacement.ts'
import { seededRng } from './rng.ts'

describe('legalPlacements', () => {
  it('offers every position a ship can occupy on an empty board', () => {
    // A ship of length n fits in (BOARD_SIZE - n + 1) positions per row, in both directions.
    const destroyerPositions = legalPlacements({ placements: [], shots: [] }, 'destroyer')

    expect(destroyerPositions).toHaveLength(2 * BOARD_SIZE * (BOARD_SIZE - 2 + 1))
  })

  it('offers only positions that the shared validator accepts', () => {
    const board = randomFleet(seededRng(7))
    const withoutCruiser = removeShip(board, 'cruiser')

    const positions = legalPlacements(withoutCruiser, 'cruiser')

    expect(positions.length).toBeGreaterThan(0)
    expect(positions.every((placement) => canPlace(withoutCruiser, placement))).toBe(true)
  })

  it('offers nothing for a ship that is already placed', () => {
    const board = randomFleet(seededRng(7))

    expect(legalPlacements(board, 'carrier')).toEqual([])
  })
})

describe('randomFleet', () => {
  it('is reproducible for a given seed, and differs between seeds', () => {
    expect(randomFleet(seededRng(1))).toEqual(randomFleet(seededRng(1)))
    expect(randomFleet(seededRng(1))).not.toEqual(randomFleet(seededRng(2)))
  })

  // A generous timeout: this is a deliberately heavy test, and it also runs under coverage
  // instrumentation in CI, which is several times slower than a plain run.
  it('produces a legal fleet every time, over a thousand fleets', { timeout: 60_000 }, () => {
    // Random placement is a classic source of rare, hard-to-reproduce bugs: a ship half off
    // the board or two ships sharing a square. Rather than trust one example, generate a
    // thousand and assert the invariants on all of them.
    for (let seed = 0; seed < 1000; seed += 1) {
      const board = randomFleet(seededRng(seed))
      const cells = board.placements.flatMap(cellsForPlacement)

      expect(board.placements).toHaveLength(FLEET.length)
      expect(new Set(board.placements.map((placement) => placement.shipId)).size).toBe(FLEET.length)
      expect(cells).toHaveLength(TOTAL_SHIP_CELLS)
      expect(cells.every(isInsideBoard)).toBe(true)
      expect(occupiedCells(board).size).toBe(TOTAL_SHIP_CELLS)
      expect(board.shots).toHaveLength(0)
    }
  })

  it('uses both orientations across many fleets rather than always one', () => {
    const orientations = new Set(
      Array.from({ length: 50 }, (_, seed) => randomFleet(seededRng(seed)))
        .flatMap((board) => board.placements)
        .map((placement) => placement.orientation),
    )

    expect(orientations).toEqual(new Set(['horizontal', 'vertical']))
  })

  it('spreads ships around the board rather than favouring one corner', () => {
    const origins = new Set(
      Array.from({ length: 200 }, (_, seed) => randomFleet(seededRng(seed)))
        .flatMap((board) => board.placements)
        .map((placement) => `${placement.origin.row},${placement.origin.col}`),
    )

    // A meaningful spread without asserting a specific distribution, which would be brittle.
    expect(origins.size).toBeGreaterThan(BOARD_SIZE * BOARD_SIZE * 0.5)
  })

  it('gives up loudly rather than hanging if it cannot place the fleet', () => {
    // An RNG that always returns 0 still succeeds, so failure is forced by allowing no
    // attempts at all: the point is that the function returns instead of looping forever.
    expect(() => randomFleet(seededRng(1), 0)).toThrow(/Could not place the fleet/)
  })
})
