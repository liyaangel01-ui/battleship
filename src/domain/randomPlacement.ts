import { canPlace, createEmptyBoard, placeShip } from './board.ts'
import { BOARD_SIZE, FLEET } from './constants.ts'
import { pick, type Rng } from './rng.ts'
import type { Board, Orientation, Placement, ShipId } from './types.ts'

const ORIENTATIONS: readonly Orientation[] = ['horizontal', 'vertical']

/**
 * Every legal position for one ship on the given board.
 *
 * Enumerating the legal options and then choosing one is deliberate: the obvious
 * alternative — guess a position and retry until it happens to be legal — has no upper
 * bound on how long it can take and can spin forever on a crowded board.
 */
export function legalPlacements(board: Board, shipId: ShipId): Placement[] {
  const placements: Placement[] = []
  for (const orientation of ORIENTATIONS) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const placement: Placement = { shipId, origin: { row, col }, orientation }
        if (canPlace(board, placement)) placements.push(placement)
      }
    }
  }
  return placements
}

/**
 * Places the whole fleet at random, obeying exactly the same rules as the player.
 *
 * Ships are placed longest first, which is when the board is emptiest and a ship is least
 * likely to have nowhere to go. If a fleet ever did paint itself into a corner the attempt
 * is abandoned and restarted, with a hard cap so this can never hang.
 */
export function randomFleet(rng: Rng, attempts = 20): Board {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const board = tryRandomFleet(rng)
    if (board) return board
  }
  throw new Error(`Could not place the fleet at random in ${attempts} attempts`)
}

function tryRandomFleet(rng: Rng): Board | undefined {
  let board = createEmptyBoard()
  for (const ship of FLEET) {
    const placement = pick(legalPlacements(board, ship.id), rng)
    if (!placement) return undefined
    board = placeShip(board, placement)
  }
  return board
}
