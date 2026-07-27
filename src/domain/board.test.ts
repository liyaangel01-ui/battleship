import { describe, expect, it } from 'vitest'

import {
  canPlace,
  cellsForPlacement,
  checkPlacement,
  createEmptyBoard,
  isFleetComplete,
  occupiedCells,
  placeShip,
  placementFor,
  removeShip,
  shipDefinition,
} from './board.ts'
import { FLEET, TOTAL_SHIP_CELLS } from './constants.ts'
import { at, boardWith, placement } from './testFixtures.ts'

describe('the fleet', () => {
  it('is the five standard ships occupying seventeen squares in total', () => {
    expect(FLEET.map((ship) => [ship.name, ship.length])).toEqual([
      ['Carrier', 5],
      ['Battleship', 4],
      ['Cruiser', 3],
      ['Submarine', 3],
      ['Destroyer', 2],
    ])
    expect(TOTAL_SHIP_CELLS).toBe(17)
  })

  it('looks up ships by identifier', () => {
    expect(shipDefinition('cruiser')?.length).toBe(3)
    expect(shipDefinition('dinghy' as 'cruiser')).toBeUndefined()
  })
})

describe('cellsForPlacement', () => {
  it('runs left to right when horizontal', () => {
    expect(cellsForPlacement(placement('cruiser', 'B2', 'horizontal'))).toEqual([
      at('B2'),
      at('C2'),
      at('D2'),
    ])
  })

  it('runs top to bottom when vertical', () => {
    expect(cellsForPlacement(placement('cruiser', 'B2', 'vertical'))).toEqual([
      at('B2'),
      at('B3'),
      at('B4'),
    ])
  })

  it('reports the squares beyond the edge rather than silently shortening the ship', () => {
    const cells = cellsForPlacement(placement('destroyer', 'J1', 'horizontal'))

    expect(cells).toHaveLength(2)
    expect(cells[1]).toEqual({ row: 0, col: 10 })
  })
})

describe('checkPlacement', () => {
  const empty = createEmptyBoard()

  it('accepts a ship that fits', () => {
    expect(checkPlacement(empty, placement('carrier', 'A1', 'horizontal'))).toEqual({ ok: true })
  })

  it('accepts ships that sit exactly against each edge', () => {
    expect(canPlace(empty, placement('carrier', 'F1', 'horizontal'))).toBe(true)
    expect(canPlace(empty, placement('carrier', 'A6', 'vertical'))).toBe(true)
    expect(canPlace(empty, placement('destroyer', 'I10', 'horizontal'))).toBe(true)
    expect(canPlace(empty, placement('destroyer', 'J9', 'vertical'))).toBe(true)
  })

  it('rejects a ship that would extend one square past the right edge', () => {
    expect(checkPlacement(empty, placement('carrier', 'G1', 'horizontal'))).toEqual({
      ok: false,
      reason: 'off-board',
    })
  })

  it('rejects a ship that would extend one square past the bottom edge', () => {
    expect(checkPlacement(empty, placement('carrier', 'A7', 'vertical'))).toEqual({
      ok: false,
      reason: 'off-board',
    })
  })

  it('does not let a horizontal ship wrap from the last column to the first', () => {
    const board = boardWith(placement('destroyer', 'J1', 'vertical'))

    // If columns wrapped, a destroyer at J5 across would occupy J5 and A5 and be accepted.
    expect(canPlace(board, placement('cruiser', 'J5', 'horizontal'))).toBe(false)
    expect(occupiedCells(board).has('A5')).toBe(false)
  })

  it('rejects a ship overlapping another ship', () => {
    const board = boardWith(placement('carrier', 'C3', 'horizontal'))

    expect(checkPlacement(board, placement('cruiser', 'D1', 'vertical'))).toEqual({
      ok: false,
      reason: 'overlaps-another-ship',
    })
  })

  it('rejects an overlap of a single square at the very end of a ship', () => {
    const board = boardWith(placement('carrier', 'A1', 'horizontal'))

    expect(canPlace(board, placement('destroyer', 'E1', 'vertical'))).toBe(false)
    expect(canPlace(board, placement('destroyer', 'F1', 'vertical'))).toBe(true)
  })

  it('allows ships to touch without overlapping', () => {
    const board = boardWith(placement('carrier', 'A1', 'horizontal'))

    expect(canPlace(board, placement('battleship', 'A2', 'horizontal'))).toBe(true)
  })

  it('rejects placing the same ship twice', () => {
    const board = boardWith(placement('cruiser', 'A1', 'horizontal'))

    expect(checkPlacement(board, placement('cruiser', 'A5', 'horizontal'))).toEqual({
      ok: false,
      reason: 'ship-already-placed',
    })
  })

  it('rejects a ship that is not part of the fleet', () => {
    expect(checkPlacement(empty, placement('dinghy' as 'cruiser', 'A1', 'horizontal'))).toEqual({
      ok: false,
      reason: 'unknown-ship',
    })
  })
})

describe('placeShip', () => {
  it('leaves the original board untouched', () => {
    const before = createEmptyBoard()
    const after = placeShip(before, placement('cruiser', 'A1', 'horizontal'))

    expect(before.placements).toHaveLength(0)
    expect(after.placements).toHaveLength(1)
  })

  it('throws rather than accepting an illegal placement', () => {
    expect(() => placeShip(createEmptyBoard(), placement('carrier', 'H1', 'horizontal'))).toThrow(
      /off-board/,
    )
  })
})

describe('removeShip', () => {
  it('frees the squares the ship occupied so another ship can use them', () => {
    const board = boardWith(placement('carrier', 'A1', 'horizontal'))
    const cleared = removeShip(board, 'carrier')

    expect(placementFor(cleared, 'carrier')).toBeUndefined()
    expect(canPlace(cleared, placement('battleship', 'A1', 'horizontal'))).toBe(true)
  })

  it('ignores a ship that was never placed', () => {
    const board = boardWith(placement('carrier', 'A1', 'horizontal'))

    expect(removeShip(board, 'destroyer')).toEqual(board)
  })
})

describe('isFleetComplete', () => {
  it('is false until all five ships are placed', () => {
    const almost = boardWith(
      placement('carrier', 'A1', 'horizontal'),
      placement('battleship', 'A2', 'horizontal'),
      placement('cruiser', 'A3', 'horizontal'),
      placement('submarine', 'A4', 'horizontal'),
    )

    expect(isFleetComplete(almost)).toBe(false)
    expect(isFleetComplete(placeShip(almost, placement('destroyer', 'A5', 'horizontal')))).toBe(
      true,
    )
  })

  it('occupies exactly seventeen squares once complete', () => {
    const full = boardWith(
      placement('carrier', 'A1', 'horizontal'),
      placement('battleship', 'A2', 'horizontal'),
      placement('cruiser', 'A3', 'horizontal'),
      placement('submarine', 'A4', 'horizontal'),
      placement('destroyer', 'A5', 'horizontal'),
    )

    expect(occupiedCells(full).size).toBe(TOTAL_SHIP_CELLS)
  })
})
