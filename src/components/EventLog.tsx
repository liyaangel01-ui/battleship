import type { LogEntry } from '../state/gameState.ts'
import { describeShot } from '../state/logText.ts'

/**
 * The running commentary, newest first.
 *
 * The newest entry sits in a live region so a screen-reader user hears the result of each
 * shot — the announcement, not the colour of a square, is what actually conveys the outcome.
 */
export function EventLog({ entries }: { readonly entries: readonly LogEntry[] }) {
  const newest = entries.at(-1)

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 px-4 py-2">
      <p aria-live="polite" className="min-h-5 text-sm">
        {newest ? describeShot(newest) : 'No shots fired yet.'}
      </p>

      {/* The history is folded away by default: the last shot is what a player needs, and the
          screen is meant to hold the whole game without scrolling. */}
      <details className="mt-1">
        <summary className="cursor-pointer text-xs tracking-wide text-ocean-300 uppercase">
          Battle log — {entries.length} {entries.length === 1 ? 'shot' : 'shots'}
        </summary>
        <ol className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-ocean-300">
          {/* The newest shot is spelled out above, so the history picks up after it. */}
          {[...entries]
            .reverse()
            .slice(1)
            .map((entry) => (
              <li key={entry.shotNumber}>{describeShot(entry)}</li>
            ))}
        </ol>
      </details>
    </section>
  )
}
