import { useGame } from '../state/useGame.ts'
import { BattleScreen } from './BattleScreen.tsx'
import { PlacementScreen } from './PlacementScreen.tsx'

export function App() {
  const [state, dispatch] = useGame()

  // The title is not in a page header: it sits between the two boards during the battle, and
  // above the fleet during placement, where it anchors whichever screen is showing.
  return (
    <div className="flex min-h-full flex-col bg-ink font-sans text-chalk">
      <main className="flex-1 px-6 py-6">
        {state.phase === 'placement' ? (
          <PlacementScreen state={state} dispatch={dispatch} />
        ) : (
          <BattleScreen state={state} dispatch={dispatch} />
        )}
      </main>

      <footer className="px-6 py-3 text-center font-mono text-[0.65rem] tracking-[0.2em] text-fog uppercase">
        Single-player Battleship &middot; no accounts, no server
      </footer>
    </div>
  )
}
