import { placeShip } from './board.ts'
import { parseCoordinate } from './coordinates.ts'
import { fireAt } from './shots.ts'
import type { Board, Coordinate, Orientation, Placement, ShipId } from './types.ts'
import { createEmptyBoard } from './board.ts'

/**
 * Helpers shared by the domain and AI tests.
 *
 * They exist so that tests read like the game ("place the carrier at A1 across, fire at
 * B2") instead of like arithmetic, which makes an incorrect expectation easier to spot.
 */

/** Turns a label such as "D4" into a coordinate, throwing if the label is not a square. */
export function at(label: string): Coordinate {
  const coordinate = parseCoordinate(label)
  if (!coordinate) throw new Error(`"${label}" is not a square on the board`)
  return coordinate
}

export function placement(
  shipId: ShipId,
  originLabel: string,
  orientation: Orientation,
): Placement {
  return { shipId, origin: at(originLabel), orientation }
}

/** Builds a board from a list of placements, failing loudly if any of them is illegal. */
export function boardWith(...placements: readonly Placement[]): Board {
  return placements.reduce(placeShip, createEmptyBoard())
}

/** Fires at each label in turn and returns the final board. */
export function fireAll(board: Board, ...labels: readonly string[]): Board {
  return labels.reduce((current, label) => fireAt(current, at(label)).board, board)
}
