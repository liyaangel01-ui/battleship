import { FLEET } from '../domain/constants.ts'
import type { Orientation, ShipId } from '../domain/types.ts'

/** Drawing units per board square. Everything below is expressed in these. */
const CELL = 100

const SHIP_LENGTHS = new Map(FLEET.map((ship) => [ship.id, ship.length]))

/** A hull with a pointed bow on the right and a squared-off stern on the left. */
function hull(length: number): string {
  const bow = length * CELL
  return `M 8 50 L 24 22 H ${bow - 30} L ${bow - 8} 50 L ${bow - 30} 78 H 24 Z`
}

/** A rounded hull, used for the submarine so it reads differently from the surface ships. */
function submarineHull(length: number): string {
  const bow = length * CELL
  return `M 10 50 Q 10 26 40 26 H ${bow - 34} Q ${bow - 8} 50 ${bow - 34} 74 H 40 Q 10 74 10 50 Z`
}

interface Detail {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly radius?: number
}

/**
 * The few marks that tell one ship from another at this size: a deck island, turrets, a
 * conning tower. Anything more disappears in a square 30 pixels wide.
 */
const DETAILS: Record<ShipId, (length: number) => readonly Detail[]> = {
  carrier: (length) => [
    { x: 40, y: 44, width: length * CELL - 90, height: 12, radius: 2 },
    { x: length * CELL - 150, y: 12, width: 30, height: 30, radius: 3 },
  ],
  battleship: (length) => [
    { x: 60, y: 38, width: 44, height: 24, radius: 4 },
    { x: length * CELL - 150, y: 38, width: 44, height: 24, radius: 4 },
    { x: (length * CELL) / 2 - 8, y: 10, width: 16, height: 34, radius: 2 },
  ],
  cruiser: (length) => [
    { x: 56, y: 38, width: 40, height: 24, radius: 4 },
    { x: length * CELL - 130, y: 14, width: 16, height: 30, radius: 2 },
  ],
  submarine: (length) => [{ x: (length * CELL) / 2 - 14, y: 14, width: 28, height: 26, radius: 3 }],
  destroyer: (length) => [{ x: (length * CELL) / 2 - 16, y: 16, width: 32, height: 28, radius: 3 }],
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
  const path = shipId === 'submarine' ? submarineHull(length) : hull(length)

  return (
    <svg
      viewBox={vertical ? `0 0 ${CELL} ${long}` : `0 0 ${long} ${CELL}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Drawn once, bow to the right, then given a quarter turn for a vertical ship. */}
      <g fill="currentColor" transform={vertical ? `translate(${CELL} 0) rotate(90)` : undefined}>
        <path d={path} />
        {DETAILS[shipId](length).map((detail) => (
          <rect
            key={`${detail.x}-${detail.y}`}
            x={detail.x}
            y={detail.y}
            width={detail.width}
            height={detail.height}
            rx={detail.radius ?? 0}
            fill="#000000"
            fillOpacity={0.55}
          />
        ))}
      </g>
    </svg>
  )
}
