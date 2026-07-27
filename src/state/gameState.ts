import type { Board, Coordinate, Orientation, ShipId } from '../domain/types.ts'

export type Player = 'player' | 'ai'

/** One line in the event log: who fired, where, and what happened. */
export interface LogEntry {
  readonly shotNumber: number
  readonly by: Player
  readonly coordinate: Coordinate
  readonly outcome: 'miss' | 'hit' | 'sunk'
  readonly shipId?: ShipId
}

/**
 * The game before it starts: the player is arranging their fleet.
 * There is no AI board yet — the opponent's ships are placed when the game begins.
 */
export interface PlacementState {
  readonly phase: 'placement'
  readonly playerBoard: Board
  readonly selectedShipId: ShipId | undefined
  readonly orientation: Orientation
}

interface BattleBase {
  readonly playerBoard: Board
  readonly aiBoard: Board
  readonly log: readonly LogEntry[]
}

/**
 * The game in progress. The two turns are separate types rather than one type with a
 * `phase: 'playerTurn' | 'aiTurn'` field, so that a function can require "a state where it
 * is the player's turn" and have the compiler enforce it.
 */
export interface PlayerTurnState extends BattleBase {
  readonly phase: 'playerTurn'
}

export interface AiTurnState extends BattleBase {
  readonly phase: 'aiTurn'
}

export type BattleState = PlayerTurnState | AiTurnState

export interface GameOverState extends BattleBase {
  readonly phase: 'gameOver'
  readonly winner: Player
}

/** Any state in which shots have been fired, i.e. anything after placement. */
export type StartedState = BattleState | GameOverState

/**
 * The whole game, as a union of the states it can actually be in.
 *
 * Modelling it this way means the compiler rejects nonsense such as reading `winner` while
 * the game is still being played, or reading the AI's board during placement — those fields
 * do not exist in those states. It is the type system enforcing the game's flow.
 */
export type GameState = PlacementState | BattleState | GameOverState

export type GameAction =
  | { readonly type: 'selectShip'; readonly shipId: ShipId }
  | { readonly type: 'setOrientation'; readonly orientation: Orientation }
  | { readonly type: 'toggleOrientation' }
  | { readonly type: 'placeSelectedShip'; readonly origin: Coordinate }
  | { readonly type: 'removeShip'; readonly shipId: ShipId }
  | { readonly type: 'randomizeFleet' }
  | { readonly type: 'clearFleet' }
  | { readonly type: 'startGame' }
  | { readonly type: 'playerFire'; readonly coordinate: Coordinate }
  | { readonly type: 'aiFire' }
  | { readonly type: 'newGame' }
