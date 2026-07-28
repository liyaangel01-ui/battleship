import { useRef, type KeyboardEvent, type ReactNode } from 'react'

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
  /** Marks drawn inside the square — a peg, a hit marker, a targeting reticle. */
  readonly content?: ReactNode
}

interface GridProps {
  /** Names the grid for assistive technology, e.g. "Your waters". */
  readonly ariaLabel: string
  readonly cell: (coordinate: Coordinate) => GridCellProps
  readonly onCellClick?: (coordinate: Coordinate) => void
  readonly onCellEnter?: (coordinate: Coordinate) => void
  readonly onLeave?: () => void
  /** Extra grid items drawn over the squares, used for the ship outlines. */
  readonly children?: ReactNode
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
export function Grid({ ariaLabel, cell, onCellClick, onCellEnter, onLeave, children }: GridProps) {
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
      // The board takes as much of the window as it can while leaving room for everything
      // around it: capped by height as well as width, so a whole game still fits a short
      // screen without scrolling.
      className="grid w-full max-w-[min(36rem,52vh)] select-none"
      style={{ gridTemplateColumns: `1.75rem repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      {/* Every item is placed explicitly. The ship overlays are positioned by grid line, and a
          mix of placed and auto-placed items would push the squares out of their own rows. */}
      {COLUMN_LABELS.map((label, col) => (
        <span
          key={label}
          aria-hidden="true"
          style={{ gridColumn: col + 2, gridRow: 1 }}
          className="pb-1.5 text-center text-[0.65rem] tracking-widest text-fog"
        >
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

      {children}
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
        style={{ gridColumn: 1, gridRow: row + 2 }}
        className="self-center pr-1.5 text-right text-[0.65rem] leading-none text-fog"
      >
        {rowLabel}
      </span>
      {rowCoordinates.map((coordinate) => {
        const props = cell(coordinate)
        // Each square draws its top and left rule; the last column and row close the frame.
        // Single-sided rules keep every line exactly one pixel wide.
        const edges = [
          'border-t border-l',
          coordinate.col === BOARD_SIZE - 1 ? 'border-r' : '',
          coordinate.row === BOARD_SIZE - 1 ? 'border-b' : '',
        ].join(' ')

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
            style={{ gridColumn: coordinate.col + 2, gridRow: coordinate.row + 2 }}
            className={`group relative flex aspect-square w-full items-center justify-center border-line/60 transition-colors focus:z-10 focus:outline-2 focus:outline-offset-[-2px] focus:outline-chalk ${edges} ${props.className}`}
          >
            {props.content}
          </button>
        )
      })}
    </>
  )
}
