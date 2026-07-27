import type { ShipDefinition } from './types.ts'

/** The board is BOARD_SIZE x BOARD_SIZE. Every rule derives its bounds from this value. */
export const BOARD_SIZE = 10

/**
 * The five ships, longest first.
 *
 * Placement order follows this array because placing the longest ship first is both the
 * conventional way to play and the order in which a random placement is least likely to
 * run out of room.
 */
export const FLEET: readonly ShipDefinition[] = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
]

/** Total squares a complete fleet occupies: the number of hits needed to win. */
export const TOTAL_SHIP_CELLS = FLEET.reduce((sum, ship) => sum + ship.length, 0)
