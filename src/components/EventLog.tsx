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
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-ocean-300 uppercase">Battle log</h3>

      <p aria-live="polite" className="mt-1 min-h-5 text-sm">
        {newest ? describeShot(newest) : 'No shots fired yet.'}
      </p>

      <ol className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto text-xs text-ocean-300">
        {[...entries]
          .reverse()
          .slice(1)
          .map((entry) => (
            <li key={entry.shotNumber}>{describeShot(entry)}</li>
          ))}
      </ol>
    </section>
  )
}
