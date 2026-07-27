import { shipStatuses } from '../domain/shots.ts'
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
  const remaining = statuses.filter((status) => !status.isSunk).length

  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-ocean-300 uppercase">{title}</h3>
      <p className="mt-1 text-sm">
        {remaining} of {statuses.length} ships afloat
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {statuses.map(({ ship, isSunk, hits }) => {
          const damageShown = isSunk ? ship.length : revealDamage ? hits : 0

          return (
            <li key={ship.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={isSunk ? 'text-ocean-300 line-through' : ''}>{ship.name}</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: ship.length }, (_, cell) => (
                  <span
                    key={cell}
                    className={`h-2.5 w-2.5 rounded-[2px] ${
                      cell < damageShown
                        ? isSunk
                          ? 'bg-rose-600'
                          : 'bg-amber-400'
                        : 'bg-ocean-300/40'
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
