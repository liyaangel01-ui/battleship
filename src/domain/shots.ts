import { cellsForPlacement, occupiedCells, shipDefinition } from './board.ts'
import { FLEET } from './constants.ts'
import { coordinateKey, isInsideBoard, sameCoordinate } from './coordinates.ts'
import type { Board, Coordinate, ShipId, ShipStatus, ShotResult } from './types.ts'

export function hasFiredAt(board: Board, coordinate: Coordinate): boolean {
  return board.shots.some((shot) => sameCoordinate(shot, coordinate))
}

/** A square may be fired at once, and only if it is on the board. */
export function canFireAt(board: Board, coordinate: Coordinate): boolean {
  return isInsideBoard(coordinate) && !hasFiredAt(board, coordinate)
}

/** Whether a square that has already been fired at contains part of a ship. */
export function isHit(board: Board, coordinate: Coordinate): boolean {
  return occupiedCells(board).has(coordinateKey(coordinate))
}

export function isShipSunk(board: Board, shipId: ShipId): boolean {
  const placement = board.placements.find((candidate) => candidate.shipId === shipId)
  if (!placement) return false

  return cellsForPlacement(placement).every((cell) => hasFiredAt(board, cell))
}

/**
 * Fires at a square, returning the resulting board and what happened.
 *
 * Throws when the shot is not allowed. The caller (the reducer) checks `canFireAt` first,
 * so an illegal shot reaching this function means a bug elsewhere and should fail loudly
 * rather than quietly corrupt the game.
 */
export function fireAt(board: Board, coordinate: Coordinate): { board: Board; result: ShotResult } {
  if (!isInsideBoard(coordinate)) {
    throw new Error(`Cannot fire outside the board at row ${coordinate.row}, col ${coordinate.col}`)
  }
  if (hasFiredAt(board, coordinate)) {
    throw new Error(`Already fired at ${coordinateKey(coordinate)}`)
  }

  const nextBoard: Board = { ...board, shots: [...board.shots, coordinate] }
  const shipId = occupiedCells(board).get(coordinateKey(coordinate))

  if (!shipId) {
    return { board: nextBoard, result: { kind: 'miss' } }
  }

  // Sinking is judged against the board *after* the shot, and by ship identity rather than
  // by coordinate, so hits on a neighbouring ship can never sink this one.
  const kind = isShipSunk(nextBoard, shipId) ? 'sunk' : 'hit'
  return { board: nextBoard, result: { kind, shipId } }
}

/** The live state of every ship placed on the board, in fleet order. */
export function shipStatuses(board: Board): ShipStatus[] {
  return FLEET.flatMap((ship) => {
    const placement = board.placements.find((candidate) => candidate.shipId === ship.id)
    if (!placement) return []

    const hits = cellsForPlacement(placement).filter((cell) => hasFiredAt(board, cell)).length
    return [{ ship, hits, isSunk: hits === ship.length }]
  })
}

/** How many of this board's ships are still afloat. */
export function shipsRemaining(board: Board): number {
  return shipStatuses(board).filter((status) => !status.isSunk).length
}

/**
 * Whether every ship on this board has been sunk.
 *
 * A board with no ships on it is not "destroyed": that would report a winner during the
 * placement phase, before the game has even started.
 */
export function isFleetDestroyed(board: Board): boolean {
  const statuses = shipStatuses(board)
  return statuses.length > 0 && statuses.every((status) => status.isSunk)
}

/** Names a ship for display. Falls back to the identifier if the ship is unknown. */
export function shipName(shipId: ShipId): string {
  return shipDefinition(shipId)?.name ?? shipId
}
