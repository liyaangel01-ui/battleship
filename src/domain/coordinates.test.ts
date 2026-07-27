import { describe, expect, it } from 'vitest'

import { BOARD_SIZE } from './constants.ts'
import {
  COLUMN_LABELS,
  ROW_LABELS,
  allCoordinates,
  coordinateKey,
  formatCoordinate,
  isInsideBoard,
  orthogonalNeighbours,
  parseCoordinate,
  sameCoordinate,
} from './coordinates.ts'

describe('labels', () => {
  it('labels columns with letters and rows with one-based numbers', () => {
    expect(COLUMN_LABELS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])
    expect(ROW_LABELS).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('formats a coordinate in the column-row form used in the interface', () => {
    expect(formatCoordinate({ row: 3, col: 3 })).toBe('D-4')
    expect(formatCoordinate({ row: 0, col: 0 })).toBe('A-1')
    expect(formatCoordinate({ row: 9, col: 9 })).toBe('J-10')
  })

  it('gives every square a distinct key', () => {
    const keys = allCoordinates().map(coordinateKey)

    expect(new Set(keys).size).toBe(BOARD_SIZE * BOARD_SIZE)
  })
})

describe('parseCoordinate', () => {
  it('accepts labels with and without a separator, in either case', () => {
    expect(parseCoordinate('D4')).toEqual({ row: 3, col: 3 })
    expect(parseCoordinate('D-4')).toEqual({ row: 3, col: 3 })
    expect(parseCoordinate('d4')).toEqual({ row: 3, col: 3 })
    expect(parseCoordinate(' J10 ')).toEqual({ row: 9, col: 9 })
  })

  it('rejects labels that are not squares on the board', () => {
    expect(parseCoordinate('K1')).toBeUndefined()
    expect(parseCoordinate('A0')).toBeUndefined()
    expect(parseCoordinate('A11')).toBeUndefined()
    expect(parseCoordinate('44')).toBeUndefined()
    expect(parseCoordinate('')).toBeUndefined()
  })
})

describe('isInsideBoard', () => {
  it('accepts the four corners', () => {
    expect(isInsideBoard({ row: 0, col: 0 })).toBe(true)
    expect(isInsideBoard({ row: 0, col: BOARD_SIZE - 1 })).toBe(true)
    expect(isInsideBoard({ row: BOARD_SIZE - 1, col: 0 })).toBe(true)
    expect(isInsideBoard({ row: BOARD_SIZE - 1, col: BOARD_SIZE - 1 })).toBe(true)
  })

  it('rejects squares one step beyond every edge', () => {
    expect(isInsideBoard({ row: -1, col: 0 })).toBe(false)
    expect(isInsideBoard({ row: 0, col: -1 })).toBe(false)
    expect(isInsideBoard({ row: BOARD_SIZE, col: 0 })).toBe(false)
    expect(isInsideBoard({ row: 0, col: BOARD_SIZE })).toBe(false)
  })
})

describe('sameCoordinate', () => {
  it('does not confuse a coordinate with its transpose', () => {
    expect(sameCoordinate({ row: 2, col: 7 }, { row: 2, col: 7 })).toBe(true)
    expect(sameCoordinate({ row: 2, col: 7 }, { row: 7, col: 2 })).toBe(false)
  })
})

describe('orthogonalNeighbours', () => {
  it('returns four neighbours in the middle of the board', () => {
    expect(orthogonalNeighbours({ row: 5, col: 5 })).toEqual([
      { row: 4, col: 5 },
      { row: 6, col: 5 },
      { row: 5, col: 4 },
      { row: 5, col: 6 },
    ])
  })

  it('never returns a square outside the board', () => {
    expect(orthogonalNeighbours({ row: 0, col: 0 })).toEqual([
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ])
    expect(orthogonalNeighbours({ row: 9, col: 9 })).toEqual([
      { row: 8, col: 9 },
      { row: 9, col: 8 },
    ])
  })

  it('produces only on-board squares for every square on the board', () => {
    for (const coordinate of allCoordinates()) {
      expect(orthogonalNeighbours(coordinate).every(isInsideBoard)).toBe(true)
    }
  })
})
