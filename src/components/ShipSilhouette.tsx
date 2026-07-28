import { FLEET } from '../domain/constants.ts'
import type { Orientation, ShipId } from '../domain/types.ts'

/** Drawing units per board square. Everything below is expressed in these. */
const CELL = 100

const SHIP_LENGTHS = new Map(FLEET.map((ship) => [ship.id, ship.length]))

/**
 * The hull of the printed manual: a long oval, drawn bow-right, tapering to a point at each
 * end. Ships are told apart the way they are on a real board — by how many squares long they
 * are — rather than by superstructure that vanishes at this size.
 */
function hull(length: number): string {
  const bow = length * CELL
  return [
    `M 12 50`,
    `C 12 26 ${CELL * 0.5} 12 ${bow / 2} 12`,
    `C ${bow - CELL * 0.5} 12 ${bow - 12} 26 ${bow - 12} 50`,
    `C ${bow - 12} 74 ${bow - CELL * 0.5} 88 ${bow / 2} 88`,
    `C ${CELL * 0.5} 88 12 74 12 50`,
    `Z`,
  ].join(' ')
}

interface ShipSilhouetteProps {
  readonly shipId: ShipId
  readonly orientation: Orientation
  readonly className?: string
}

/**
 * The outline of one ship, drawn to fill exactly the squares it occupies.
 *
 * Purely decorative: it is hidden from assistive technology and never receives pointer
 * events, so the squares underneath remain the only thing a player can click or focus.
 */
export function ShipSilhouette({ shipId, orientation, className }: ShipSilhouetteProps) {
  const length = SHIP_LENGTHS.get(shipId) ?? 1
  const long = length * CELL
  const vertical = orientation === 'vertical'

  return (
    <svg
      viewBox={vertical ? `0 0 ${CELL} ${long}` : `0 0 ${long} ${CELL}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Drawn once, bow to the right, then given a quarter turn for a vertical ship. */}
      <g fill="currentColor" transform={vertical ? `translate(${CELL} 0) rotate(90)` : undefined}>
        <path d={hull(length)} />
        {/* One peg hole per square, so a ship reads as the squares it occupies. */}
        {Array.from({ length }, (_, square) => (
          <circle
            key={square}
            cx={square * CELL + CELL / 2}
            cy={50}
            r={14}
            fill="var(--color-ink)"
          />
        ))}
      </g>
    </svg>
  )
}
