import { useRef, type KeyboardEvent } from 'react'

import { BOARD_SIZE } from '../domain/constants.ts'
import {
  COLUMN_LABELS,
  ROW_LABELS,
  allCoordinates,
  coordinateKey,
  isInsideBoard,
} from '../domain/coordinates.ts'
import type { Coordinate, CoordinateKey } from '../domain/types.ts'

/** Which way each arrow key moves the focused square. */
const ARROW_STEPS: Record<string, Coordinate> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

export interface GridCellProps {
  readonly coordinate: Coordinate
  /** Tailwind classes describing how this square looks. */
  readonly className: string
  /** Spoken by screen readers, e.g. "D-4, your carrier, hit". */
  readonly label: string
  readonly disabled?: boolean
}

interface GridProps {
  /** Names the grid for assistive technology, e.g. "Your waters". */
  readonly ariaLabel: string
  readonly cell: (coordinate: Coordinate) => GridCellProps
  readonly onCellClick?: (coordinate: Coordinate) => void
  readonly onCellEnter?: (coordinate: Coordinate) => void
  readonly onLeave?: () => void
}

/**
 * A 10×10 board with lettered columns and numbered rows.
 *
 * The component knows nothing about ships or shots: the caller decides what each square looks
 * like and what it is called. Both boards use it, so the two grids cannot drift apart, and the
 * game's rules stay out of the rendering code.
 *
 * Every square is a real `<button>`, so the whole board is reachable by keyboard and each
 * square announces its own state, rather than being a div that happens to respond to clicks.
 */
export function Grid({ ariaLabel, cell, onCellClick, onCellEnter, onLeave }: GridProps) {
  const squares = useRef(new Map<CoordinateKey, HTMLButtonElement>())

  /**
   * Arrow keys walk the board a square at a time, skipping squares that can no longer be used
   * — otherwise reaching the middle of the board means pressing Tab fifty times.
   */
  function moveFocus(event: KeyboardEvent, from: Coordinate) {
    const step = ARROW_STEPS[event.key]
    if (!step) return

    event.preventDefault()

    let next = { row: from.row + step.row, col: from.col + step.col }
    while (isInsideBoard(next)) {
      const square = squares.current.get(coordinateKey(next))
      if (square && !square.disabled) {
        square.focus()
        return
      }
      next = { row: next.row + step.row, col: next.col + step.col }
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onMouseLeave={onLeave}
      className="grid w-full max-w-[26rem] gap-px select-none"
      style={{ gridTemplateColumns: `1.25rem repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      <span aria-hidden="true" />
      {COLUMN_LABELS.map((label) => (
        <span key={label} aria-hidden="true" className="pb-1 text-center text-xs text-ocean-300">
          {label}
        </span>
      ))}

      {ROW_LABELS.map((rowLabel, row) => (
        <RowCells
          key={rowLabel}
          row={row}
          rowLabel={rowLabel}
          cell={cell}
          squares={squares.current}
          onCellKeyDown={moveFocus}
          {...(onCellClick ? { onCellClick } : {})}
          {...(onCellEnter ? { onCellEnter } : {})}
        />
      ))}
    </div>
  )
}

function RowCells({
  row,
  rowLabel,
  cell,
  squares,
  onCellKeyDown,
  onCellClick,
  onCellEnter,
}: {
  readonly row: number
  readonly rowLabel: string
  readonly cell: (coordinate: Coordinate) => GridCellProps
  readonly squares: Map<CoordinateKey, HTMLButtonElement>
  readonly onCellKeyDown: (event: KeyboardEvent, coordinate: Coordinate) => void
  readonly onCellClick?: (coordinate: Coordinate) => void
  readonly onCellEnter?: (coordinate: Coordinate) => void
}) {
  const rowCoordinates = allCoordinates().filter((coordinate) => coordinate.row === row)

  return (
    <>
      <span
        aria-hidden="true"
        className="self-center pr-1 text-right text-xs leading-none text-ocean-300"
      >
        {rowLabel}
      </span>
      {rowCoordinates.map((coordinate) => {
        const props = cell(coordinate)
        return (
          <button
            key={coordinateKey(coordinate)}
            ref={(square) => {
              if (square) squares.set(coordinateKey(coordinate), square)
              else squares.delete(coordinateKey(coordinate))
            }}
            type="button"
            aria-label={props.label}
            disabled={props.disabled ?? false}
            onKeyDown={(event) => onCellKeyDown(event, coordinate)}
            onClick={() => onCellClick?.(coordinate)}
            onMouseEnter={() => onCellEnter?.(coordinate)}
            onFocus={() => onCellEnter?.(coordinate)}
            className={`aspect-square w-full rounded-[2px] border border-ocean-700/70 transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-ocean-300 ${props.className}`}
          />
        )
      })}
    </>
  )
}
