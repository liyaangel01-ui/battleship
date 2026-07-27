import { useState, type ReactNode } from 'react'

import { canPlace, cellsForPlacement, isFleetComplete, occupiedCells } from '../domain/board.ts'
import { FLEET } from '../domain/constants.ts'
import { coordinateKey, formatCoordinate, isInsideBoard } from '../domain/coordinates.ts'
import type { Coordinate, Orientation, ShipId } from '../domain/types.ts'
import type { GameAction, PlacementState } from '../state/gameState.ts'
import { FleetList } from './FleetList.tsx'
import { Grid, type GridCellProps } from './Grid.tsx'

interface PlacementScreenProps {
  readonly state: PlacementState
  readonly dispatch: (action: GameAction) => void
}

const SHIP_NAMES = new Map(FLEET.map((ship) => [ship.id, ship.name]))

/**
 * The setup screen: choose a ship, choose an orientation, click a square to place it.
 *
 * The screen shows a live preview under the cursor, coloured by whether the placement is
 * legal — and legality is decided by the same `canPlace` the rules engine uses, so the
 * preview can never disagree with what actually happens on click.
 */
export function PlacementScreen({ state, dispatch }: PlacementScreenProps) {
  const [hovered, setHovered] = useState<Coordinate | undefined>(undefined)

  const { playerBoard, selectedShipId, orientation } = state
  const occupied = occupiedCells(playerBoard)
  const fleetComplete = isFleetComplete(playerBoard)

  const preview = previewFor(state, hovered)
  const previewKeys = new Set(preview.cells.map(coordinateKey))

  function cell(coordinate: Coordinate): GridCellProps {
    const key = coordinateKey(coordinate)
    const shipId = occupied.get(key)
    const shipName = shipId ? SHIP_NAMES.get(shipId) : undefined

    return {
      coordinate,
      className: cellClassName(previewKeys.has(key), preview.isLegal, shipId !== undefined),
      label: shipName
        ? `${formatCoordinate(coordinate)}, ${shipName} — click to remove`
        : `${formatCoordinate(coordinate)}, empty water`,
    }
  }

  function handleClick(coordinate: Coordinate) {
    // Clicking a placed ship picks it back up, which is the quickest way to reposition it.
    const shipId = occupied.get(coordinateKey(coordinate))
    dispatch(
      shipId ? { type: 'removeShip', shipId } : { type: 'placeSelectedShip', origin: coordinate },
    )
  }

  return (
    <div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-12">
      <div className="w-full max-w-[26rem]">
        <h2 className="mb-1 text-lg font-semibold">Position your fleet</h2>
        <p className="mb-4 text-sm text-ocean-300">
          {selectedShipId
            ? `Placing the ${SHIP_NAMES.get(selectedShipId) ?? ''} — click a square on your grid.`
            : 'Every ship is placed. Adjust anything you like, then start the battle.'}
        </p>

        <Grid
          ariaLabel="Your waters"
          cell={cell}
          onCellClick={handleClick}
          onCellEnter={setHovered}
          onLeave={() => setHovered(undefined)}
        />
      </div>

      <div className="flex w-full max-w-xs flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold tracking-wide text-ocean-300 uppercase">
            Orientation
          </legend>
          <div className="flex gap-2">
            {(['horizontal', 'vertical'] as const).map((option) => (
              <OrientationButton
                key={option}
                option={option}
                current={orientation}
                onSelect={() => dispatch({ type: 'setOrientation', orientation: option })}
              />
            ))}
          </div>
        </fieldset>

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-ocean-300 uppercase">
            Fleet
          </h3>
          <FleetList
            board={playerBoard}
            selectedShipId={selectedShipId}
            onSelect={(shipId: ShipId) => dispatch({ type: 'selectShip', shipId })}
            onRemove={(shipId: ShipId) => dispatch({ type: 'removeShip', shipId })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <SecondaryButton onClick={() => dispatch({ type: 'randomizeFleet' })}>
              Random fleet
            </SecondaryButton>
            <SecondaryButton onClick={() => dispatch({ type: 'clearFleet' })}>
              Clear
            </SecondaryButton>
          </div>

          <button
            type="button"
            disabled={!fleetComplete}
            onClick={() => dispatch({ type: 'startGame' })}
            className="rounded-md bg-ocean-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-ocean-300 hover:text-ocean-900 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-ocean-300"
          >
            Start battle
          </button>
          {fleetComplete ? null : (
            <p className="text-xs text-ocean-300">All five ships must be placed first.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/** The squares the selected ship would occupy, and whether that placement is allowed. */
function previewFor(
  state: PlacementState,
  hovered: Coordinate | undefined,
): { cells: readonly Coordinate[]; isLegal: boolean } {
  if (!hovered || !state.selectedShipId) return { cells: [], isLegal: false }

  const placement = {
    shipId: state.selectedShipId,
    origin: hovered,
    orientation: state.orientation,
  }

  // Off-board squares are dropped from the preview but still make it illegal, so a ship
  // hanging over the edge is shown as rejected rather than silently shortened.
  return {
    cells: cellsForPlacement(placement).filter(isInsideBoard),
    isLegal: canPlace(state.playerBoard, placement),
  }
}

function cellClassName(inPreview: boolean, previewIsLegal: boolean, hasShip: boolean): string {
  if (inPreview) return previewIsLegal ? 'bg-emerald-400/80' : 'bg-rose-500/70'
  if (hasShip) return 'bg-ocean-300 hover:bg-ocean-300/70'
  return 'bg-ocean-700/40 hover:bg-ocean-700/80'
}

function OrientationButton({
  option,
  current,
  onSelect,
}: {
  readonly option: Orientation
  readonly current: Orientation
  readonly onSelect: () => void
}) {
  const isSelected = option === current
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition-colors ${
        isSelected
          ? 'border-ocean-300 bg-ocean-700/60'
          : 'border-white/10 bg-white/5 hover:border-ocean-300/60'
      }`}
    >
      {option}
    </button>
  )
}

function SecondaryButton({
  onClick,
  children,
}: {
  readonly onClick: () => void
  readonly children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm transition-colors hover:border-ocean-300/60"
    >
      {children}
    </button>
  )
}
