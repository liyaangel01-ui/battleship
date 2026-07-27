import { FLEET } from './constants.ts'
import { coordinateKey, isInsideBoard } from './coordinates.ts'
import type {
  Board,
  Coordinate,
  CoordinateKey,
  Placement,
  PlacementCheck,
  ShipDefinition,
  ShipId,
} from './types.ts'

const SHIPS_BY_ID = new Map<ShipId, ShipDefinition>(FLEET.map((ship) => [ship.id, ship]))

export function shipDefinition(shipId: ShipId): ShipDefinition | undefined {
  return SHIPS_BY_ID.get(shipId)
}

export function createEmptyBoard(): Board {
  return { placements: [], shots: [] }
}

/**
 * The squares a placement would occupy.
 *
 * Squares outside the board are included rather than filtered out, so that callers can
 * detect an over-the-edge placement instead of silently receiving a shortened ship.
 */
export function cellsForPlacement(placement: Placement): Coordinate[] {
  const ship = SHIPS_BY_ID.get(placement.shipId)
  if (!ship) return []

  const { row, col } = placement.origin
  return Array.from({ length: ship.length }, (_, offset) =>
    placement.orientation === 'horizontal'
      ? { row, col: col + offset }
      : { row: row + offset, col },
  )
}

/** Maps every occupied square on the board to the ship occupying it. */
export function occupiedCells(board: Board): Map<CoordinateKey, ShipId> {
  const occupied = new Map<CoordinateKey, ShipId>()
  for (const placement of board.placements) {
    for (const cell of cellsForPlacement(placement)) {
      occupied.set(coordinateKey(cell), placement.shipId)
    }
  }
  return occupied
}

export function placementFor(board: Board, shipId: ShipId): Placement | undefined {
  return board.placements.find((placement) => placement.shipId === shipId)
}

/**
 * The single source of truth for whether a placement is legal.
 *
 * The placement interface, the reducer and the AI's random placement all call this, so the
 * player's fleet and the opponent's fleet provably obey identical rules.
 */
export function checkPlacement(board: Board, placement: Placement): PlacementCheck {
  if (!SHIPS_BY_ID.has(placement.shipId)) {
    return { ok: false, reason: 'unknown-ship' }
  }
  if (placementFor(board, placement.shipId)) {
    return { ok: false, reason: 'ship-already-placed' }
  }

  const cells = cellsForPlacement(placement)
  if (!cells.every(isInsideBoard)) {
    return { ok: false, reason: 'off-board' }
  }

  const occupied = occupiedCells(board)
  if (cells.some((cell) => occupied.has(coordinateKey(cell)))) {
    return { ok: false, reason: 'overlaps-another-ship' }
  }

  return { ok: true }
}

export function canPlace(board: Board, placement: Placement): boolean {
  return checkPlacement(board, placement).ok
}

/**
 * Returns a new board with the ship placed.
 * Throws on an illegal placement: callers must ask `checkPlacement` first, so reaching
 * here with an illegal placement is a programming error and should be loud, not silent.
 */
export function placeShip(board: Board, placement: Placement): Board {
  const check = checkPlacement(board, placement)
  if (!check.ok) {
    throw new Error(`Cannot place ${placement.shipId}: ${check.reason}`)
  }
  return { ...board, placements: [...board.placements, placement] }
}

/** Returns a new board without the given ship. Removing an absent ship is a no-op. */
export function removeShip(board: Board, shipId: ShipId): Board {
  return {
    ...board,
    placements: board.placements.filter((placement) => placement.shipId !== shipId),
  }
}

export function isFleetComplete(board: Board): boolean {
  return FLEET.every((ship) => placementFor(board, ship.id) !== undefined)
}
