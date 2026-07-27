import { cellsForPlacement } from './board.ts'
import { coordinateKey } from './coordinates.ts'
import { hasFiredAt } from './shots.ts'
import type { Board, Coordinate, ShipId } from './types.ts'

/**
 * What firing at a square tells the player who fired.
 *
 * Note what is missing: a plain hit does **not** say which ship was struck, because a real
 * opponent is not told that. Only a sinking names the ship. The AI is given nothing more
 * than this, which is why it cannot cheat even in principle.
 */
export type ObservedResult =
  | { readonly kind: 'miss' }
  | { readonly kind: 'hit' }
  | { readonly kind: 'sunk'; readonly shipId: ShipId }

export interface ObservedShot {
  readonly coordinate: Coordinate
  readonly result: ObservedResult
}

/** The complete history of shots fired at a board, in the order they were fired. */
export interface OpponentView {
  readonly shots: readonly ObservedShot[]
}

/**
 * Derives the attacker's view of a board: their own shots and what each one revealed.
 * Ship positions that have not been fully sunk are not represented at all.
 */
export function opponentView(board: Board): OpponentView {
  const shipCellsByKey = new Map<string, { shipId: ShipId; cells: Coordinate[] }>()
  for (const placement of board.placements) {
    const cells = cellsForPlacement(placement)
    for (const cell of cells) {
      shipCellsByKey.set(coordinateKey(cell), { shipId: placement.shipId, cells })
    }
  }

  const firedSoFar: Coordinate[] = []
  const shots = board.shots.map((coordinate): ObservedShot => {
    firedSoFar.push(coordinate)
    const ship = shipCellsByKey.get(coordinateKey(coordinate))

    if (!ship) return { coordinate, result: { kind: 'miss' } }

    // Sinking is judged against the shots fired up to and including this one, so replaying
    // the history reproduces exactly what the attacker was told at the time.
    const partialBoard: Board = { placements: board.placements, shots: firedSoFar }
    const sunk = ship.cells.every((cell) => hasFiredAt(partialBoard, cell))
    return { coordinate, result: sunk ? { kind: 'sunk', shipId: ship.shipId } : { kind: 'hit' } }
  })

  return { shots }
}
