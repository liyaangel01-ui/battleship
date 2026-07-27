import { BOARD_SIZE } from './constants.ts'
import type { Coordinate, CoordinateKey } from './types.ts'

const LETTER_A = 'A'.charCodeAt(0)

/** Column headings, "A" through "J" for a 10-wide board. */
export const COLUMN_LABELS: readonly string[] = Array.from({ length: BOARD_SIZE }, (_, col) =>
  String.fromCharCode(LETTER_A + col),
)

/** Row headings, "1" through "10" for a 10-tall board. */
export const ROW_LABELS: readonly string[] = Array.from({ length: BOARD_SIZE }, (_, row) =>
  String(row + 1),
)

export function columnLabel(col: number): string {
  return String.fromCharCode(LETTER_A + col)
}

export function rowLabel(row: number): string {
  return String(row + 1)
}

/** The human-readable form used in the interface and the event log, e.g. "D-4". */
export function formatCoordinate({ row, col }: Coordinate): string {
  return `${columnLabel(col)}-${rowLabel(row)}`
}

/** A compact, unique key for use in Maps and Sets, e.g. "D4". */
export function coordinateKey({ row, col }: Coordinate): CoordinateKey {
  return `${columnLabel(col)}${rowLabel(row)}`
}

/**
 * Builds a coordinate from its human-readable label, e.g. "D4" or "D-4".
 * Returns undefined for anything that is not a square on the board, so callers must
 * handle bad input rather than receive a silently wrong coordinate.
 */
export function parseCoordinate(label: string): Coordinate | undefined {
  const match = /^([A-Za-z])-?(\d{1,2})$/.exec(label.trim())
  if (!match) return undefined

  const [, letter, digits] = match
  if (letter === undefined || digits === undefined) return undefined

  const coordinate = { row: Number(digits) - 1, col: letter.toUpperCase().charCodeAt(0) - LETTER_A }
  return isInsideBoard(coordinate) ? coordinate : undefined
}

export function isInsideBoard({ row, col }: Coordinate): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function sameCoordinate(a: Coordinate, b: Coordinate): boolean {
  return a.row === b.row && a.col === b.col
}

/** Every square on the board, in reading order. */
export function allCoordinates(): Coordinate[] {
  const coordinates: Coordinate[] = []
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      coordinates.push({ row, col })
    }
  }
  return coordinates
}

/** The up-to-four squares directly above, below, left and right of a coordinate. */
export function orthogonalNeighbours(coordinate: Coordinate): Coordinate[] {
  const { row, col } = coordinate
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ].filter(isInsideBoard)
}
