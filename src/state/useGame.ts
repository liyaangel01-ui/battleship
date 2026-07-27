import { useMemo, useReducer } from 'react'

import { defaultRng, type Rng } from '../domain/rng.ts'
import { createGameReducer, initialPlacementState } from './gameReducer.ts'
import type { GameAction, GameState } from './gameState.ts'

/**
 * Connects the pure game reducer to React.
 *
 * This is the only place the two meet: components dispatch actions and render state, and the
 * rules stay in plain functions that can be tested without rendering anything. The random
 * source is a parameter so a test can pass a seeded one and replay an identical game.
 */
export function useGame(rng: Rng = defaultRng): [GameState, (action: GameAction) => void] {
  const reducer = useMemo(() => createGameReducer(rng), [rng])
  return useReducer(reducer, undefined, initialPlacementState)
}
