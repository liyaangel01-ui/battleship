import { FLEET } from '../domain/constants.ts'
import type { Board, ShipId } from '../domain/types.ts'

interface FleetListProps {
  readonly board: Board
  readonly selectedShipId: ShipId | undefined
  readonly onSelect: (shipId: ShipId) => void
  readonly onRemove: (shipId: ShipId) => void
}

/** The fleet roster during placement: which ships are placed, and which one is selected. */
export function FleetList({ board, selectedShipId, onSelect, onRemove }: FleetListProps) {
  return (
    <ul className="flex flex-col gap-1.5">
      {FLEET.map((ship) => {
        const isPlaced = board.placements.some((placement) => placement.shipId === ship.id)
        const isSelected = ship.id === selectedShipId

        return (
          <li key={ship.id} className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={isSelected}
              aria-label={`${ship.name}, ${ship.length} squares, ${isPlaced ? 'placed' : 'not yet placed'}`}
              onClick={() => onSelect(ship.id)}
              className={`flex flex-1 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? 'border-ocean-300 bg-ocean-700/60'
                  : 'border-white/10 bg-white/5 hover:border-ocean-300/60'
              }`}
            >
              <span className="text-sm font-medium">{ship.name}</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: ship.length }, (_, cell) => (
                  <span
                    key={cell}
                    className={`h-2.5 w-2.5 rounded-[2px] ${isPlaced ? 'bg-ocean-300' : 'bg-white/20'}`}
                  />
                ))}
              </span>
            </button>

            {isPlaced ? (
              <button
                type="button"
                aria-label={`Remove ${ship.name}`}
                onClick={() => onRemove(ship.id)}
                className="rounded-md border border-white/10 px-2 py-2 text-xs text-ocean-300 transition-colors hover:border-ocean-300/60 hover:text-ocean-50"
              >
                Remove
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
