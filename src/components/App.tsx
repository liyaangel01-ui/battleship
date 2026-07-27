import { useGame } from '../state/useGame.ts'
import { PlacementScreen } from './PlacementScreen.tsx'

export function App() {
  const [state, dispatch] = useGame()

  return (
    <div className="flex min-h-full flex-col bg-ocean-900 text-ocean-50">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-wide">Battleship</h1>
        <p className="text-sm text-ocean-300">Play against an AI opponent</p>
      </header>

      <main className="flex-1 px-6 py-8">
        {state.phase === 'placement' ? (
          <PlacementScreen state={state} dispatch={dispatch} />
        ) : (
          <section className="max-w-md">
            <h2 className="text-lg font-semibold">Fleets are in position</h2>
            <p className="mt-2 text-sm text-ocean-300">
              Both fleets are placed and the opponent is waiting. The battle screen arrives in the
              next milestone.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'newGame' })}
              className="mt-4 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-ocean-300/60"
            >
              Back to placement
            </button>
          </section>
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs text-ocean-300">
        Single-player Battleship &middot; no accounts, no server
      </footer>
    </div>
  )
}
