import { describe, expect, it } from 'vitest'

import { seededRng } from '../domain/rng.ts'
import { at, boardWith, placement } from '../domain/testFixtures.ts'
import { createGameReducer, initialPlacementState } from './gameReducer.ts'
import type { GameState } from './gameState.ts'
import { browserStorage, loadGame, saveGame } from './persistence.ts'

const KEY = 'battleship.game.v1'

/** A storage that can be inspected, and made to fail like a full or blocked one. */
function fakeStorage(failing = false): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => {
      if (failing) throw new Error('storage unavailable')
      return entries.get(key) ?? null
    },
    setItem: (key, value) => {
      if (failing) throw new Error('quota exceeded')
      entries.set(key, value)
    },
    removeItem: (key) => void entries.delete(key),
  }
}

/** A game a few shots in, so the saved state has boards, a log and a turn. */
function gameInProgress(): GameState {
  const reduce = createGameReducer(seededRng(3))
  let state: GameState = {
    ...initialPlacementState(),
    playerBoard: boardWith(
      placement('carrier', 'A1', 'horizontal'),
      placement('battleship', 'A2', 'horizontal'),
      placement('cruiser', 'A3', 'horizontal'),
      placement('submarine', 'A4', 'horizontal'),
      placement('destroyer', 'A5', 'horizontal'),
    ),
  }
  state = reduce(state, { type: 'startGame' })
  state = reduce(state, { type: 'playerFire', coordinate: at('E5') })
  return reduce(state, { type: 'aiFire' })
}

describe('saving and loading a game', () => {
  it('brings back the same game it saved', () => {
    const storage = fakeStorage()
    const state = gameInProgress()

    saveGame(storage, state)

    expect(loadGame(storage)).toEqual(state)
  })

  it('brings back a half-finished placement, including the selected ship', () => {
    const storage = fakeStorage()
    const state: GameState = {
      ...initialPlacementState(),
      playerBoard: boardWith(placement('cruiser', 'C3', 'vertical')),
      selectedShipId: 'battleship',
      orientation: 'vertical',
    }

    saveGame(storage, state)

    expect(loadGame(storage)).toEqual(state)
  })

  it('has nothing to load before a game has been played', () => {
    expect(loadGame(fakeStorage())).toBeUndefined()
  })
})

describe('a saved game that cannot be trusted', () => {
  const rejected = (saved: string) => {
    const storage = fakeStorage()
    storage.setItem(KEY, saved)
    return loadGame(storage)
  }

  it('discards text that is not JSON', () => {
    expect(rejected('not json at all')).toBeUndefined()
  })

  it('discards JSON that is not a game', () => {
    expect(rejected('"placement"')).toBeUndefined()
    expect(rejected('[]')).toBeUndefined()
    expect(rejected('null')).toBeUndefined()
  })

  it('discards an unknown phase', () => {
    expect(rejected(JSON.stringify({ ...gameInProgress(), phase: 'salvo' }))).toBeUndefined()
  })

  it('discards a game over with no winner', () => {
    const saved = { ...gameInProgress(), phase: 'gameOver' }
    expect(rejected(JSON.stringify(saved))).toBeUndefined()
  })

  it('discards a ship that does not exist', () => {
    const saved = {
      ...initialPlacementState(),
      playerBoard: {
        placements: [{ shipId: 'yacht', origin: at('A1'), orientation: 'horizontal' }],
        shots: [],
      },
    }
    expect(rejected(JSON.stringify(saved))).toBeUndefined()
  })

  it('discards the same ship placed twice', () => {
    const twice = boardWith(placement('cruiser', 'A1', 'horizontal'))
    const saved = {
      ...initialPlacementState(),
      playerBoard: { placements: [...twice.placements, ...twice.placements], shots: [] },
    }
    expect(rejected(JSON.stringify(saved))).toBeUndefined()
  })

  it('discards a square that is off the board', () => {
    const saved = {
      ...initialPlacementState(),
      playerBoard: { placements: [], shots: [{ row: 10, col: 0 }] },
    }
    expect(rejected(JSON.stringify(saved))).toBeUndefined()
  })

  it('discards a log entry with an impossible outcome', () => {
    const state = gameInProgress()
    const saved = {
      ...state,
      log: [{ shotNumber: 1, by: 'player', coordinate: at('A1'), outcome: 'grazed' }],
    }
    expect(rejected(JSON.stringify(saved))).toBeUndefined()
  })

  it('discards a shot fired by nobody', () => {
    const state = gameInProgress()
    const saved = {
      ...state,
      log: [{ shotNumber: 1, by: 'referee', coordinate: at('A1'), outcome: 'miss' }],
    }
    expect(rejected(JSON.stringify(saved))).toBeUndefined()
  })
})

describe('storage that is unavailable', () => {
  it('loads nothing and saves nothing rather than throwing', () => {
    const blocked = fakeStorage(true)

    expect(() => saveGame(blocked, gameInProgress())).not.toThrow()
    expect(loadGame(blocked)).toBeUndefined()
  })

  it('copes with there being no storage at all', () => {
    expect(() => saveGame(undefined, gameInProgress())).not.toThrow()
    expect(loadGame(undefined)).toBeUndefined()
  })

  it('finds the browser storage when there is one', () => {
    expect(browserStorage()).toBe(globalThis.localStorage)
  })
})
