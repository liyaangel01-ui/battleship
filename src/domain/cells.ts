import { occupiedCells } from './board.ts'
import { allCoordinates, coordinateKey } from './coordinates.ts'
import { hasFiredAt, isShipSunk } from './shots.ts'
import type { Board, CoordinateKey } from './types.ts'

/**
 * What a single square shows.
 *
 * `unknown` is water the attacker has not fired at yet on the opponent's board — it is
 * distinct from `water`, which is a square known to be empty. That distinction is the whole
 * point of the type: it keeps "we have not looked here" separate from "there is nothing here".
 */
export type CellState = 'unknown' | 'water' | 'ship' | 'miss' | 'hit' | 'sunk'

/**
 * Derives what every square of a board should show.
 *
 * `revealShips` is the only difference between the two boards on screen: your own ships are
 * visible from the start, while the opponent's are revealed one square at a time and their
 * position is only fully known once a ship is sunk. Because both boards come from the same
 * function, they cannot end up displaying the same facts differently.
 */
export function boardCells(board: Board, revealShips: boolean): Map<CoordinateKey, CellState> {
  const occupied = occupiedCells(board)
  const sunkShips = new Set(
    board.placements
      .filter((placement) => isShipSunk(board, placement.shipId))
      .map((placement) => placement.shipId),
  )

  return new Map(
    allCoordinates().map((coordinate) => {
      const key = coordinateKey(coordinate)
      const shipId = occupied.get(key)

      if (hasFiredAt(board, coordinate)) {
        if (!shipId) return [key, 'miss']
        return [key, sunkShips.has(shipId) ? 'sunk' : 'hit']
      }

      if (shipId && revealShips) return [key, 'ship']
      return [key, revealShips ? 'water' : 'unknown']
    }),
  )
}
