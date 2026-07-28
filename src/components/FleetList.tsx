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
              className={`flex flex-1 items-center justify-between gap-3 border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk ${
                isSelected
                  ? 'border-chalk bg-chalk text-ink'
                  : 'border-edge bg-ink text-chalk hover:border-chalk/70'
              }`}
            >
              <span className="text-xs tracking-widest uppercase">{ship.name}</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: ship.length }, (_, cell) => (
                  <span
                    key={cell}
                    className={`h-2.5 w-2.5 ${
                      isPlaced
                        ? isSelected
                          ? 'bg-ink'
                          : 'bg-chalk/70'
                        : `border ${isSelected ? 'border-ink/40' : 'border-line/70'}`
                    }`}
                  />
                ))}
              </span>
            </button>

            {isPlaced ? (
              <button
                type="button"
                aria-label={`Remove ${ship.name}`}
                onClick={() => onRemove(ship.id)}
                className="border border-edge px-2 py-2 text-[0.65rem] tracking-widest text-fog uppercase transition-colors hover:border-chalk/70 hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
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
