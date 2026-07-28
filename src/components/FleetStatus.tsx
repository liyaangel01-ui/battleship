import { shipStatuses, shipsRemaining } from '../domain/shots.ts'
import type { Board } from '../domain/types.ts'

interface FleetStatusProps {
  readonly title: string
  readonly board: Board
  /**
   * Whether per-ship damage may be shown. True for your own fleet; false for the opponent's,
   * where a hit does not reveal *which* ship was struck until it sinks — the same restriction
   * the AI plays under.
   */
  readonly revealDamage: boolean
}

/** How much of a fleet is left, and which of its ships have been sunk. */
export function FleetStatus({ title, board, revealDamage }: FleetStatusProps) {
  const statuses = shipStatuses(board)
  const remaining = shipsRemaining(board)

  return (
    <section>
      <h3 className="text-[0.65rem] tracking-[0.2em] text-fog uppercase">
        {title} — {remaining} of {statuses.length} afloat
      </h3>
      {/* The fleet reads as one line across the top of the screen rather than a tall list, so
          both fleets, the key and both boards fit without scrolling. */}
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {statuses.map(({ ship, isSunk, hits }) => {
          const damageShown = isSunk ? ship.length : revealDamage ? hits : 0

          return (
            <li key={ship.id} className="flex items-center gap-1.5 text-xs">
              <span className={isSunk ? 'text-fog line-through' : 'text-chalk'}>{ship.name}</span>
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: ship.length }, (_, cell) => (
                  <span
                    key={cell}
                    className={`h-2 w-2 ${
                      cell < damageShown
                        ? isSunk
                          ? 'bg-ember'
                          : 'bg-blast'
                        : 'border border-line/70 bg-ink'
                    }`}
                  />
                ))}
              </span>
              <span className="sr-only">
                {isSunk
                  ? 'sunk'
                  : revealDamage
                    ? `${hits} ${hits === 1 ? 'hit' : 'hits'}`
                    : 'afloat'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
