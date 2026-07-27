import { FLEET } from '../domain/constants.ts'
import { isInsideBoard } from '../domain/coordinates.ts'
import type { Board, Coordinate, Orientation, Placement, ShipId } from '../domain/types.ts'
import type { GameState, LogEntry, Player } from './gameState.ts'

const STORAGE_KEY = 'battleship.game.v1'

const SHIP_IDS: readonly string[] = FLEET.map((ship) => ship.id)
const PHASES: readonly string[] = ['placement', 'playerTurn', 'aiTurn', 'gameOver']
const OUTCOMES: readonly string[] = ['miss', 'hit', 'sunk']

/**
 * Anything at all can be sitting under our key in localStorage: an older version of the game,
 * a half-written string, or something a curious player edited by hand. So a saved game is
 * treated as untrusted input and validated field by field; anything unexpected is discarded and
 * the player simply gets a fresh board. Persistence is a convenience, and it is never allowed
 * to break the game.
 */
export function loadGame(storage: Storage | undefined): GameState | undefined {
  const saved = read(storage)
  if (saved === undefined) return undefined

  try {
    return parseGameState(JSON.parse(saved))
  } catch {
    return undefined
  }
}

export function saveGame(storage: Storage | undefined, state: GameState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // A full or unavailable storage must not interrupt a game in progress.
  }
}

/** localStorage, or nothing when it is unavailable (server-side rendering, private browsing). */
export function browserStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function read(storage: Storage | undefined): string | undefined {
  try {
    return storage?.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCoordinate(value: unknown): Coordinate | undefined {
  if (!isRecord(value)) return undefined
  const { row, col } = value
  if (!Number.isInteger(row) || !Number.isInteger(col)) return undefined

  const coordinate = { row: row as number, col: col as number }
  return isInsideBoard(coordinate) ? coordinate : undefined
}

function parseShipId(value: unknown): ShipId | undefined {
  return typeof value === 'string' && SHIP_IDS.includes(value) ? (value as ShipId) : undefined
}

function parseOrientation(value: unknown): Orientation | undefined {
  return value === 'horizontal' || value === 'vertical' ? value : undefined
}

function parsePlacement(value: unknown): Placement | undefined {
  if (!isRecord(value)) return undefined

  const shipId = parseShipId(value.shipId)
  const origin = parseCoordinate(value.origin)
  const orientation = parseOrientation(value.orientation)
  if (!shipId || !origin || !orientation) return undefined

  return { shipId, origin, orientation }
}

/** Maps a list, failing as a whole if any entry fails. */
function parseAll<T>(value: unknown, parse: (entry: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) return undefined

  const parsed: T[] = []
  for (const entry of value) {
    const item = parse(entry)
    if (item === undefined) return undefined
    parsed.push(item)
  }
  return parsed
}

function parseBoard(value: unknown): Board | undefined {
  if (!isRecord(value)) return undefined

  const placements = parseAll(value.placements, parsePlacement)
  const shots = parseAll(value.shots, parseCoordinate)
  if (!placements || !shots) return undefined

  // A ship appearing twice would mean two ships of the same name, which the rules do not allow.
  if (new Set(placements.map((placement) => placement.shipId)).size !== placements.length) {
    return undefined
  }

  return { placements, shots }
}

function parseLogEntry(value: unknown): LogEntry | undefined {
  if (!isRecord(value)) return undefined

  const coordinate = parseCoordinate(value.coordinate)
  const by = value.by === 'player' || value.by === 'ai' ? (value.by as Player) : undefined
  const outcome = typeof value.outcome === 'string' && OUTCOMES.includes(value.outcome)
  if (!coordinate || !by || !outcome || !Number.isInteger(value.shotNumber)) return undefined

  const shipId = parseShipId(value.shipId)

  return {
    shotNumber: value.shotNumber as number,
    by,
    coordinate,
    outcome: value.outcome as LogEntry['outcome'],
    ...(shipId ? { shipId } : {}),
  }
}

function parseGameState(value: unknown): GameState | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.phase !== 'string' || !PHASES.includes(value.phase)) return undefined

  const playerBoard = parseBoard(value.playerBoard)
  if (!playerBoard) return undefined

  if (value.phase === 'placement') {
    const orientation = parseOrientation(value.orientation)
    if (!orientation) return undefined

    return {
      phase: 'placement',
      playerBoard,
      selectedShipId: parseShipId(value.selectedShipId),
      orientation,
    }
  }

  const aiBoard = parseBoard(value.aiBoard)
  const log = parseAll(value.log, parseLogEntry)
  if (!aiBoard || !log) return undefined

  if (value.phase === 'gameOver') {
    const winner = value.winner === 'player' || value.winner === 'ai' ? value.winner : undefined
    if (!winner) return undefined

    return { phase: 'gameOver', winner, playerBoard, aiBoard, log }
  }

  return { phase: value.phase === 'aiTurn' ? 'aiTurn' : 'playerTurn', playerBoard, aiBoard, log }
}
