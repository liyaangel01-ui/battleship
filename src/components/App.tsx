/**
 * Application shell.
 *
 * Phase 1 intentionally renders only the layout and title: the game itself is
 * built in later phases on top of the pure domain layer. Having the shell,
 * tests, CI and deployment working first means every later phase ships to a
 * URL that is already known to work.
 */
export function App() {
  return (
    <div className="flex min-h-full flex-col bg-ocean-900 text-ocean-50">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-wide">Battleship</h1>
        <p className="text-sm text-ocean-300">Play against an AI opponent</p>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <section className="max-w-md text-center">
          <h2 className="text-2xl font-semibold">Setting sail</h2>
          <p className="mt-3 text-ocean-300">
            The project scaffold, test suite, continuous integration and deployment pipeline are in
            place. Ship placement and battle arrive in the next milestones.
          </p>
        </section>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-ocean-300">
        Single-player Battleship &middot; no accounts, no server
      </footer>
    </div>
  )
}
