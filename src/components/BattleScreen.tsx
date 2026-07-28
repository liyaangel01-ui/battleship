import { useEffect, type ReactNode } from 'react'

import type { Coordinate } from '../domain/types.ts'
import type { GameAction, StartedState } from '../state/gameState.ts'
import { BattleGrid, type Impact } from './BattleGrid.tsx'
import { CommandButton } from './CommandButton.tsx'
import { EventLog } from './EventLog.tsx'
import { FleetStatus } from './FleetStatus.tsx'
import { Legend } from './Legend.tsx'
import { Wordmark } from './Wordmark.tsx'

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

  // The burst is read off the newest log entry rather than stored separately, so there is no
  // second copy of what happened and nothing to keep in step with the game.
  const lastShot = state.log.at(-1)
  const impact: Impact | undefined =
    lastShot && lastShot.outcome !== 'miss'
      ? { coordinate: lastShot.coordinate, shotNumber: lastShot.shotNumber }
      : undefined
  const impactOn = lastShot?.by

  // The whole battle is meant to fit one screen: fleets and the key across the top, both boards
  // side by side with the title and the turn between them, and the log folded away below.
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="grid gap-3 border border-edge px-4 py-3 sm:grid-cols-2">
        <FleetStatus title="Opponent fleet" board={state.aiBoard} revealDamage={isOver} />
        <FleetStatus title="Your fleet" board={state.playerBoard} revealDamage={true} />
        <div className="sm:col-span-2">
          <Legend />
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(10rem,13rem)_1fr]">
        <BoardPanel title="Opponent waters">
          <BattleGrid
            ariaLabel="Opponent waters"
            board={state.aiBoard}
            revealShips={isOver}
            onFire={fire}
            frozen={state.phase !== 'playerTurn'}
            {...(impact && impactOn === 'player' ? { impact } : {})}
          />
        </BoardPanel>

        <div className="order-first flex flex-col items-center gap-3 py-2 text-center lg:order-none lg:py-10">
          <Wordmark />
          <Status state={state} onNewGame={() => dispatch({ type: 'newGame' })} />
        </div>

        <BoardPanel title="Your waters">
          <BattleGrid
            ariaLabel="Your waters"
            board={state.playerBoard}
            revealShips={true}
            {...(impact && impactOn === 'ai' ? { impact } : {})}
          />
        </BoardPanel>
      </div>

      <EventLog entries={state.log} />
    </div>
  )
}

function BoardPanel({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col items-center">
      <h2 className="mb-2 font-mono text-xs tracking-[0.2em] text-fog uppercase">{title}</h2>
      {children}
    </section>
  )
}

/** Whose turn it is, or how the game ended. */
function Status({
  state,
  onNewGame,
}: {
  readonly state: StartedState
  readonly onNewGame: () => void
}) {
  if (state.phase === 'gameOver') {
    return (
      <section role="status" className="flex flex-col items-center gap-2">
        <h2 className="text-sm font-semibold text-chalk">
          {state.winner === 'player'
            ? 'You win — the enemy fleet is destroyed.'
            : 'You lose — your fleet is gone.'}
        </h2>
        <p className="text-xs text-fog">
          {state.log.length} shots were fired in total. The full enemy fleet is now revealed.
        </p>
        <CommandButton onClick={onNewGame}>Play again</CommandButton>
      </section>
    )
  }

  return (
    <p aria-live="polite" className="font-mono text-xs tracking-wide text-fog uppercase">
      {state.phase === 'playerTurn'
        ? 'Your turn — pick a square in the opponent waters.'
        : 'The opponent is taking aim…'}
    </p>
  )
}
