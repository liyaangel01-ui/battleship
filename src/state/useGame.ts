import { useEffect, useMemo, useReducer } from 'react'

import { defaultRng, type Rng } from '../domain/rng.ts'
import { createGameReducer, initialPlacementState } from './gameReducer.ts'
import type { GameAction, GameState } from './gameState.ts'
import { browserStorage, loadGame, saveGame } from './persistence.ts'

/**
 * Connects the pure game reducer to React, and keeps the game alive across a refresh.
 *
 * This is the only place the two meet: components dispatch actions and render state, and the
 * rules stay in plain functions that can be tested without rendering anything. The random
 * source and the storage are parameters so a test can pass a seeded random and its own storage.
 */
export function useGame(
  rng: Rng = defaultRng,
  storage: Storage | undefined = browserStorage(),
): [GameState, (action: GameAction) => void] {
  const reducer = useMemo(() => createGameReducer(rng), [rng])
  const [state, dispatch] = useReducer(
    reducer,
    storage,
    (saved) => loadGame(saved) ?? initialPlacementState(),
  )

  useEffect(() => {
    saveGame(storage, state)
  }, [storage, state])

  return [state, dispatch]
}
