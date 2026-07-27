import { describe, expect, it } from 'vitest'

import { cellsForPlacement, createEmptyBoard } from './board.ts'
import { TOTAL_SHIP_CELLS } from './constants.ts'
import {
  canFireAt,
  fireAt,
  hasFiredAt,
  isFleetDestroyed,
  isHit,
  isShipSunk,
  shipName,
  shipStatuses,
  shipsRemaining,
} from './shots.ts'
import { at, boardWith, fireAll, placement } from './testFixtures.ts'

const fullFleet = () =>
  boardWith(
    placement('carrier', 'A1', 'horizontal'),
    placement('battleship', 'A3', 'horizontal'),
    placement('cruiser', 'A5', 'horizontal'),
    placement('submarine', 'A7', 'horizontal'),
    placement('destroyer', 'A9', 'horizontal'),
  )

describe('fireAt', () => {
  it('reports a miss on empty water and records the shot', () => {
    const board = boardWith(placement('cruiser', 'A1', 'horizontal'))
    const { board: after, result } = fireAt(board, at('J10'))

    expect(result).toEqual({ kind: 'miss' })
    expect(hasFiredAt(after, at('J10'))).toBe(true)
    expect(isHit(after, at('J10'))).toBe(false)
  })

  it('reports a hit and names the ship struck', () => {
    const board = boardWith(placement('cruiser', 'B2', 'horizontal'))
    const { result } = fireAt(board, at('C2'))

    expect(result).toEqual({ kind: 'hit', shipId: 'cruiser' })
  })

  it('reports a sink only on the shot that completes the ship', () => {
    const board = boardWith(placement('destroyer', 'B2', 'horizontal'))

    const first = fireAt(board, at('B2'))
    expect(first.result).toEqual({ kind: 'hit', shipId: 'destroyer' })
    expect(isShipSunk(first.board, 'destroyer')).toBe(false)

    const second = fireAt(first.board, at('C2'))
    expect(second.result).toEqual({ kind: 'sunk', shipId: 'destroyer' })
    expect(isShipSunk(second.board, 'destroyer')).toBe(true)
  })

  it('does not sink a ship when the hits belong to its neighbour', () => {
    // Two ships lying side by side: sinking one must not affect the other.
    const board = boardWith(
      placement('destroyer', 'A1', 'horizontal'),
      placement('cruiser', 'C1', 'horizontal'),
    )
    const after = fireAll(board, 'A1', 'B1', 'C1', 'D1')

    expect(isShipSunk(after, 'destroyer')).toBe(true)
    expect(isShipSunk(after, 'cruiser')).toBe(false)
    expect(shipsRemaining(after)).toBe(1)
  })

  it('leaves the board it was given unchanged', () => {
    const board = boardWith(placement('cruiser', 'B2', 'horizontal'))
    fireAt(board, at('B2'))

    expect(board.shots).toHaveLength(0)
  })

  it('refuses to fire at the same square twice', () => {
    const board = fireAll(boardWith(placement('cruiser', 'B2', 'horizontal')), 'B2')

    expect(canFireAt(board, at('B2'))).toBe(false)
    expect(() => fireAt(board, at('B2'))).toThrow(/Already fired at B2/)
  })

  it('refuses to fire outside the board', () => {
    const board = createEmptyBoard()

    expect(canFireAt(board, { row: -1, col: 0 })).toBe(false)
    expect(() => fireAt(board, { row: 10, col: 0 })).toThrow(/outside the board/)
  })
})

describe('shipStatuses', () => {
  it('counts hits per ship and reports only placed ships', () => {
    const board = fireAll(boardWith(placement('cruiser', 'B2', 'horizontal')), 'B2', 'D2')

    expect(shipStatuses(board)).toEqual([
      { ship: { id: 'cruiser', name: 'Cruiser', length: 3 }, hits: 2, isSunk: false },
    ])
  })

  it('lists the whole fleet in fleet order, longest first', () => {
    expect(shipStatuses(fullFleet()).map((status) => status.ship.id)).toEqual([
      'carrier',
      'battleship',
      'cruiser',
      'submarine',
      'destroyer',
    ])
  })
})

describe('isFleetDestroyed', () => {
  it('is false for a board with no ships, so nobody wins during placement', () => {
    expect(isFleetDestroyed(createEmptyBoard())).toBe(false)
  })

  it('becomes true on exactly the seventeenth hit, and not before', () => {
    const board = fullFleet()
    const shipCells = board.placements.flatMap(cellsForPlacement)

    expect(shipCells).toHaveLength(TOTAL_SHIP_CELLS)

    let current = board
    shipCells.forEach((cell, index) => {
      current = fireAt(current, cell).board
      const isLastCell = index === shipCells.length - 1

      expect(isFleetDestroyed(current)).toBe(isLastCell)
    })

    expect(shipsRemaining(current)).toBe(0)
  })

  it('is unaffected by misses', () => {
    const board = fireAll(fullFleet(), 'J1', 'J2', 'J3')

    expect(isFleetDestroyed(board)).toBe(false)
    expect(shipsRemaining(board)).toBe(5)
  })
})

describe('shipName', () => {
  it('gives the display name for a ship', () => {
    expect(shipName('battleship')).toBe('Battleship')
  })
})
