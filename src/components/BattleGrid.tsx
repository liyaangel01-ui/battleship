import { boardCells, type CellState } from '../domain/cells.ts'
import { coordinateKey, formatCoordinate, sameCoordinate } from '../domain/coordinates.ts'
import { occupiedCells } from '../domain/board.ts'
import type { Board, Coordinate } from '../domain/types.ts'
import { isShipSunk, shipName } from '../domain/shots.ts'
import { FleetOverlay } from './FleetOverlay.tsx'
import { Grid, type GridCellProps } from './Grid.tsx'

/** The shot to play the impact burst on: the newest one, if it landed. */
export interface Impact {
  readonly coordinate: Coordinate
  /** Restarts the animation for each new shot rather than replaying the old one. */
  readonly shotNumber: number
}

interface BattleGridProps {
  readonly ariaLabel: string
  readonly board: Board
  /** Your own board shows its ships; the opponent's reveals them only as they are hit. */
  readonly revealShips: boolean
  readonly onFire?: (coordinate: Coordinate) => void
  /** Squares stop responding when it is not your turn or the game is over. */
  readonly frozen?: boolean
  readonly impact?: Impact
}

const CELL_CLASSES: Record<CellState, string> = {
  unknown: 'bg-ink',
  water: 'bg-ink',
  ship: 'bg-chalk/8',
  miss: 'bg-ink',
  hit: 'z-10 bg-blast/15',
  sunk: 'z-10 bg-ember/20',
}

const CELL_DESCRIPTIONS: Record<CellState, string> = {
  unknown: 'not yet fired at',
  water: 'empty water',
  ship: 'your ship',
  miss: 'miss',
  hit: 'hit',
  sunk: 'sunk',
}

/** One player's waters during the battle. */
export function BattleGrid({
  ariaLabel,
  board,
  revealShips,
  onFire,
  frozen,
  impact,
}: BattleGridProps) {
  const cells = boardCells(board, revealShips)
  const occupied = occupiedCells(board)

  // Hulls are drawn only for ships the viewer is entitled to see: your own fleet, and the
  // opponent's ships once they have been sunk. Nothing else reaches the page.
  const visiblePlacements = revealShips
    ? board.placements
    : board.placements.filter((placement) => isShipSunk(board, placement.shipId))

  function cell(coordinate: Coordinate): GridCellProps {
    const key = coordinateKey(coordinate)
    const cellState = cells.get(key) ?? 'unknown'
    const shipId = occupied.get(key)
    const isFireable = Boolean(onFire) && frozen !== true && cellState === 'unknown'

    // A sunk ship is named because both players are told what went down; a ship that is
    // merely hit is not, and neither is an intact one on the opponent's board.
    const detail =
      cellState === 'sunk' && shipId ? `${shipName(shipId)} sunk` : CELL_DESCRIPTIONS[cellState]

    return {
      coordinate,
      className: `${CELL_CLASSES[cellState]} ${isFireable ? 'cursor-crosshair hover:bg-chalk/10' : ''}`,
      label: `${formatCoordinate(coordinate)}, ${detail}`,
      disabled: !onFire || frozen === true || cellState !== 'unknown',
      content: (
        <>
          {isFireable ? <Reticle /> : null}
          <Marker state={cellState} />
          {impact && sameCoordinate(impact.coordinate, coordinate) ? (
            <ImpactBurst key={impact.shotNumber} />
          ) : null}
        </>
      ),
    }
  }

  return (
    <Grid ariaLabel={ariaLabel} cell={cell} {...(onFire ? { onCellClick: onFire } : {})}>
      <FleetOverlay
        placements={visiblePlacements}
        className={revealShips ? 'z-0 text-chalk/60' : 'z-0 text-ember/80'}
        reveal={!revealShips}
      />
    </Grid>
  )
}

/** The permanent mark left on a square once it has been fired at. */
function Marker({ state }: { readonly state: CellState }) {
  // An unfired square shows the empty peg hole of the printed board, faint enough that a
  // miss peg beside it is never in doubt.
  if (state === 'unknown') {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none block h-1/3 w-1/3 rounded-full border border-line/45"
      />
    )
  }

  if (state === 'miss') {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none block h-2/5 w-2/5 rounded-full border-2 border-chalk/80"
      />
    )
  }

  if (state === 'hit' || state === 'sunk') {
    return (
      <span
        aria-hidden="true"
        className={`pointer-events-none block h-2/5 w-2/5 rounded-full ${
          state === 'sunk' ? 'bg-ember' : 'bg-blast'
        }`}
      />
    )
  }

  return null
}

/** A targeting reticle shown while a square is under the cursor or keyboard focus. */
function Reticle() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-[15%] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      <span className="absolute inset-0 rounded-full border border-chalk/70" />
      <span className="absolute top-1/2 left-[-15%] h-px w-[30%] bg-chalk/70" />
      <span className="absolute top-1/2 right-[-15%] h-px w-[30%] bg-chalk/70" />
    </span>
  )
}

/** A flat radial burst that plays once when a shot lands, leaving the hit marker behind. */
function ImpactBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      <span className="animate-impact-ring absolute inset-[15%] rounded-full border-2 border-ember" />
      <span className="animate-impact-spikes absolute inset-[-10%] bg-blast" />
      <span className="animate-impact-flash absolute inset-[18%] rounded-full bg-flash shadow-[0_0_0_4px_var(--color-blast)]" />
    </span>
  )
}
