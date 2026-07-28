import { shipDefinition } from '../domain/board.ts'
import type { Placement } from '../domain/types.ts'
import { ShipSilhouette } from './ShipSilhouette.tsx'

interface FleetOverlayProps {
  /**
   * The ships to draw. Callers pass only the placements the viewer is allowed to see — for the
   * opponent's waters that is the sunk ships alone, so nothing hidden reaches the page.
   */
  readonly placements: readonly Placement[]
  /** Tailwind colour class for the hulls, e.g. `text-chalk/70`. */
  readonly className: string
  /** Fades each hull in as it appears, used when a ship is revealed by sinking. */
  readonly reveal?: boolean
}

/**
 * Ship outlines laid over a board.
 *
 * Rendered as items of the same CSS grid as the squares, so a hull lines up with its squares
 * exactly and stays aligned at any board size. It sits above the squares but takes no pointer
 * events, leaving every click and focus target untouched.
 */
export function FleetOverlay({ placements, className, reveal }: FleetOverlayProps) {
  return (
    <>
      {placements.map(({ shipId, origin, orientation }) => {
        const horizontal = orientation === 'horizontal'
        const span = shipDefinition(shipId)?.length ?? 1

        return (
          <div
            key={shipId}
            aria-hidden="true"
            // Column 1 and row 1 of the grid hold the coordinate labels, so the board starts at 2.
            style={{
              gridColumn: `${origin.col + 2} / span ${horizontal ? span : 1}`,
              gridRow: `${origin.row + 2} / span ${horizontal ? 1 : span}`,
            }}
            className={`pointer-events-none flex items-center justify-center p-[3px] ${className} ${
              reveal ? 'animate-reveal' : ''
            }`}
          >
            <ShipSilhouette shipId={shipId} orientation={orientation} className="h-full w-full" />
          </div>
        )
      })}
    </>
  )
}
