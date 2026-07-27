import { boardCells, type CellState } from '../domain/cells.ts'
import { coordinateKey, formatCoordinate } from '../domain/coordinates.ts'
import { occupiedCells } from '../domain/board.ts'
import type { Board, Coordinate } from '../domain/types.ts'
import { shipName } from '../domain/shots.ts'
import { Grid, type GridCellProps } from './Grid.tsx'

interface BattleGridProps {
  readonly ariaLabel: string
  readonly board: Board
  /** Your own board shows its ships; the opponent's reveals them only as they are hit. */
  readonly revealShips: boolean
  readonly onFire?: (coordinate: Coordinate) => void
  /** Squares stop responding when it is not your turn or the game is over. */
  readonly frozen?: boolean
}

const CELL_CLASSES: Record<CellState, string> = {
  unknown: 'bg-ocean-700/40',
  water: 'bg-ocean-700/40',
  ship: 'bg-ocean-300',
  miss: 'bg-ocean-900',
  hit: 'bg-amber-400',
  sunk: 'bg-rose-600',
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
export function BattleGrid({ ariaLabel, board, revealShips, onFire, frozen }: BattleGridProps) {
  const cells = boardCells(board, revealShips)
  const occupied = occupiedCells(board)

  function cell(coordinate: Coordinate): GridCellProps {
    const key = coordinateKey(coordinate)
    const cellState = cells.get(key) ?? 'unknown'
    const shipId = occupied.get(key)

    // A sunk ship is named because both players are told what went down; a ship that is
    // merely hit is not, and neither is an intact one on the opponent's board.
    const detail =
      cellState === 'sunk' && shipId ? `${shipName(shipId)} sunk` : CELL_DESCRIPTIONS[cellState]

    return {
      coordinate,
      className: `${CELL_CLASSES[cellState]} ${
        onFire && !frozen && cellState === 'unknown' ? 'cursor-crosshair hover:bg-ocean-500' : ''
      }`,
      label: `${formatCoordinate(coordinate)}, ${detail}`,
      disabled: !onFire || frozen === true || cellState !== 'unknown',
    }
  }

  return <Grid ariaLabel={ariaLabel} cell={cell} {...(onFire ? { onCellClick: onFire } : {})} />
}
