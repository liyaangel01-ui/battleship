import { nextShot } from '../ai/aiPlayer.ts'
import {
  canPlace,
  createEmptyBoard,
  isFleetComplete,
  placeShip,
  removeShip,
} from '../domain/board.ts'
import { FLEET } from '../domain/constants.ts'
import { randomFleet } from '../domain/randomPlacement.ts'
import type { Rng } from '../domain/rng.ts'
import { canFireAt, fireAt, isFleetDestroyed } from '../domain/shots.ts'
import type { Board, Coordinate, ShipId } from '../domain/types.ts'
import { opponentView } from '../domain/view.ts'
import type {
  AiTurnState,
  GameAction,
  GameState,
  LogEntry,
  PlacementState,
  Player,
  PlayerTurnState,
  StartedState,
} from './gameState.ts'

/**
 * The one place the game can change.
 *
 * Every rule about *when* something may happen lives here: you cannot fire during placement,
 * cannot fire out of turn, cannot fire twice at the same square, and nothing at all happens
 * after the game is over. Because there is a single entry point, those guarantees are
 * auditable in one file instead of being spread across click handlers.
 *
 * The reducer is pure. Randomness is supplied by the caller, so a seeded generator makes an
 * entire game — placement and AI included — replay identically in a test.
 */
export function createGameReducer(rng: Rng) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'selectShip':
        return state.phase === 'placement' ? { ...state, selectedShipId: action.shipId } : state

      case 'setOrientation':
        return state.phase === 'placement' ? { ...state, orientation: action.orientation } : state

      case 'toggleOrientation':
        return state.phase === 'placement'
          ? {
              ...state,
              orientation: state.orientation === 'horizontal' ? 'vertical' : 'horizontal',
            }
          : state

      case 'placeSelectedShip':
        return state.phase === 'placement' ? placeSelectedShip(state, action.origin) : state

      case 'removeShip':
        return state.phase === 'placement'
          ? {
              ...state,
              playerBoard: removeShip(state.playerBoard, action.shipId),
              selectedShipId: action.shipId,
            }
          : state

      case 'randomizeFleet':
        return state.phase === 'placement'
          ? { ...state, playerBoard: randomFleet(rng), selectedShipId: undefined }
          : state

      case 'clearFleet':
        return state.phase === 'placement' ? initialPlacementState() : state

      case 'startGame':
        return state.phase === 'placement' && isFleetComplete(state.playerBoard)
          ? {
              phase: 'playerTurn',
              playerBoard: state.playerBoard,
              aiBoard: randomFleet(rng),
              log: [],
            }
          : state

      case 'playerFire':
        return state.phase === 'playerTurn' ? resolvePlayerShot(state, action.coordinate) : state

      case 'aiFire':
        return state.phase === 'aiTurn' ? resolveAiShot(state, rng) : state

      case 'newGame':
        return initialPlacementState()
    }
  }
}

export function initialPlacementState(): PlacementState {
  return {
    phase: 'placement',
    playerBoard: createEmptyBoard(),
    selectedShipId: FLEET[0]?.id,
    orientation: 'horizontal',
  }
}

function placeSelectedShip(state: PlacementState, origin: Coordinate): PlacementState {
  const shipId = state.selectedShipId
  if (!shipId) return state

  const placement = { shipId, origin, orientation: state.orientation }
  if (!canPlace(state.playerBoard, placement)) return state

  const playerBoard = placeShip(state.playerBoard, placement)
  return { ...state, playerBoard, selectedShipId: nextUnplacedShip(playerBoard, shipId) }
}

/**
 * After placing a ship, select the next one still waiting to be placed, so the player can
 * place a whole fleet without going back to the list between every ship.
 */
function nextUnplacedShip(board: Board, justPlaced: ShipId): ShipId | undefined {
  const unplaced = FLEET.filter(
    (ship) => !board.placements.some((placement) => placement.shipId === ship.id),
  )
  const startIndex = FLEET.findIndex((ship) => ship.id === justPlaced)
  const after = unplaced.find((ship) => FLEET.indexOf(ship) > startIndex)

  return (after ?? unplaced[0])?.id
}

function resolvePlayerShot(state: PlayerTurnState, coordinate: Coordinate): GameState {
  if (!canFireAt(state.aiBoard, coordinate)) return state

  const { board: aiBoard, result } = fireAt(state.aiBoard, coordinate)
  const log = appendLog(state, 'player', coordinate, result)

  // The win is checked before the turn passes, so the AI never gets a shot back after losing.
  if (isFleetDestroyed(aiBoard)) {
    return { phase: 'gameOver', winner: 'player', playerBoard: state.playerBoard, aiBoard, log }
  }

  return { ...state, phase: 'aiTurn', aiBoard, log }
}

function resolveAiShot(state: AiTurnState, rng: Rng): GameState {
  const coordinate = nextShot(opponentView(state.playerBoard), rng)
  const { board: playerBoard, result } = fireAt(state.playerBoard, coordinate)
  const log = appendLog(state, 'ai', coordinate, result)

  if (isFleetDestroyed(playerBoard)) {
    return { phase: 'gameOver', winner: 'ai', playerBoard, aiBoard: state.aiBoard, log }
  }

  return { ...state, phase: 'playerTurn', playerBoard, log }
}

function appendLog(
  state: StartedState,
  by: Player,
  coordinate: Coordinate,
  result: { kind: 'miss' | 'hit' | 'sunk'; shipId?: ShipId },
): LogEntry[] {
  const entry: LogEntry = {
    shotNumber: state.log.length + 1,
    by,
    coordinate,
    outcome: result.kind,
    ...(result.shipId ? { shipId: result.shipId } : {}),
  }
  return [...state.log, entry]
}
