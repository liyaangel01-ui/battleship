import { useGame } from '../state/useGame.ts'
import { BattleScreen } from './BattleScreen.tsx'
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
          <BattleScreen state={state} dispatch={dispatch} />
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs text-ocean-300">
        Single-player Battleship &middot; no accounts, no server
      </footer>
    </div>
  )
}
