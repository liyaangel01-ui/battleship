import { useEffect } from 'react'

import type { Coordinate } from '../domain/types.ts'
import type { GameAction, StartedState } from '../state/gameState.ts'
import { BattleGrid } from './BattleGrid.tsx'
import { EventLog } from './EventLog.tsx'
import { FleetStatus } from './FleetStatus.tsx'
import { Legend } from './Legend.tsx'

/**
 * How long the opponent "thinks" before firing. Instant replies feel like a glitch rather
 * than a turn, and the pause is what makes the two shots readable as separate events.
 */
export const AI_TURN_DELAY_MS = 700

interface BattleScreenProps {
  readonly state: StartedState
  readonly dispatch: (action: GameAction) => void
  /** Overridden by tests so they do not have to wait out the pause. */
  readonly aiDelayMs?: number
}

export function BattleScreen({ state, dispatch, aiDelayMs = AI_TURN_DELAY_MS }: BattleScreenProps) {
  const isOver = state.phase === 'gameOver'

  // The AI's turn is a timer rather than part of the reducer, because a reducer must stay pure
  // and synchronous. The cleanup matters: without it, starting a new game mid-turn would fire
  // a shot into the fresh game.
  useEffect(() => {
    if (state.phase !== 'aiTurn') return

    const timer = setTimeout(() => dispatch({ type: 'aiFire' }), aiDelayMs)
    return () => clearTimeout(timer)
  }, [state.phase, dispatch, aiDelayMs])

  function fire(coordinate: Coordinate) {
    dispatch({ type: 'playerFire', coordinate })
  }

  return (
    <div className="flex flex-col gap-8">
      <StatusBanner state={state} onNewGame={() => dispatch({ type: 'newGame' })} />

      <div className="flex flex-col gap-8 xl:flex-row xl:gap-12">
        <section className="w-full max-w-[26rem]">
          <h2 className="mb-3 text-lg font-semibold">Opponent waters</h2>
          <BattleGrid
            ariaLabel="Opponent waters"
            board={state.aiBoard}
            revealShips={isOver}
            onFire={fire}
            frozen={state.phase !== 'playerTurn'}
          />
        </section>

        <section className="w-full max-w-[26rem]">
          <h2 className="mb-3 text-lg font-semibold">Your waters</h2>
          <BattleGrid ariaLabel="Your waters" board={state.playerBoard} revealShips={true} />
        </section>

        <div className="flex w-full max-w-xs flex-col gap-6">
          <FleetStatus title="Opponent fleet" board={state.aiBoard} revealDamage={isOver} />
          <FleetStatus title="Your fleet" board={state.playerBoard} revealDamage={true} />
          <EventLog entries={state.log} />
          <Legend />
        </div>
      </div>
    </div>
  )
}

function StatusBanner({
  state,
  onNewGame,
}: {
  readonly state: StartedState
  readonly onNewGame: () => void
}) {
  if (state.phase === 'gameOver') {
    const playerWon = state.winner === 'player'

    return (
      <section
        className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
          playerWon
            ? 'border-emerald-400/60 bg-emerald-400/10'
            : 'border-rose-500/60 bg-rose-500/10'
        }`}
      >
        <div>
          <h2 className="text-lg font-semibold">
            {playerWon
              ? 'You win — the enemy fleet is destroyed.'
              : 'You lose — your fleet is gone.'}
          </h2>
          <p className="text-sm text-ocean-300">
            {state.log.length} shots were fired in total. The full enemy fleet is now revealed.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewGame}
          className="rounded-md bg-ocean-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-ocean-300 hover:text-ocean-900"
        >
          Play again
        </button>
      </section>
    )
  }

  const yourTurn = state.phase === 'playerTurn'

  return (
    <p
      aria-live="polite"
      className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
    >
      {yourTurn
        ? 'Your turn — pick a square in the opponent waters.'
        : 'The opponent is taking aim…'}
    </p>
  )
}
