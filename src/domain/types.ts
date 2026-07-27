/**
 * The vocabulary of the game.
 *
 * Everything in `src/domain` is pure: no React, no DOM, no randomness and no I/O.
 * That is what makes the rules exhaustively testable without rendering anything.
 */

/** Identifies one of the five ships in a fleet. */
export type ShipId = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer'

/** A ship's fixed properties. Lengths never change, so this is data, not state. */
export interface ShipDefinition {
  readonly id: ShipId
  readonly name: string
  readonly length: number
}

export type Orientation = 'horizontal' | 'vertical'

/**
 * A square on a board, zero-indexed from the top-left.
 *
 * Zero-indexing is used everywhere internally so that arithmetic never needs an
 * off-by-one adjustment; the human-facing "D-4" form exists only at the edges of the
 * system, in `coordinates.ts`.
 */
export interface Coordinate {
  readonly row: number
  readonly col: number
}

/** A stable string form of a coordinate ("D4"), usable as an object or Map key. */
export type CoordinateKey = string

/** A ship positioned on a board: where it starts and which way it runs. */
export interface Placement {
  readonly shipId: ShipId
  readonly origin: Coordinate
  readonly orientation: Orientation
}

/**
 * One player's ocean grid.
 *
 * Only two things are stored: where the ships are, and which squares have been fired at.
 * Everything else — hits, misses, which ships have sunk, whether the fleet is destroyed —
 * is derived from those two facts on demand. Derived state cannot drift out of sync with
 * the facts it is derived from, which removes an entire category of bug.
 */
export interface Board {
  readonly placements: readonly Placement[]
  readonly shots: readonly Coordinate[]
}

/** Why a placement was rejected. Used to explain the problem rather than just refuse. */
export type PlacementError =
  'off-board' | 'overlaps-another-ship' | 'ship-already-placed' | 'unknown-ship'

export type PlacementCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: PlacementError }

/** The outcome of firing at a square. */
export type ShotResult =
  | { readonly kind: 'miss' }
  | { readonly kind: 'hit'; readonly shipId: ShipId }
  | { readonly kind: 'sunk'; readonly shipId: ShipId }

/** A ship's live state on a board, derived from the shots taken against it. */
export interface ShipStatus {
  readonly ship: ShipDefinition
  readonly hits: number
  readonly isSunk: boolean
}
