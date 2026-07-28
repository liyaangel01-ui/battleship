import { useState } from 'react'

import { canPlace, cellsForPlacement, isFleetComplete, occupiedCells } from '../domain/board.ts'
import { FLEET } from '../domain/constants.ts'
import { coordinateKey, formatCoordinate, isInsideBoard } from '../domain/coordinates.ts'
import type { Coordinate, ShipId } from '../domain/types.ts'
import type { GameAction, PlacementState } from '../state/gameState.ts'
import { CommandButton } from './CommandButton.tsx'
import { FleetList } from './FleetList.tsx'
import { FleetOverlay } from './FleetOverlay.tsx'
import { Grid, type GridCellProps } from './Grid.tsx'
import { Wordmark } from './Wordmark.tsx'

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
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Wordmark />
        <p className="font-mono text-[0.65rem] tracking-[0.2em] text-fog uppercase">
          Position your fleet
        </p>
      </div>

      <div className="flex flex-col items-start gap-8 lg:flex-row lg:gap-12">
        <div className="w-full max-w-[24rem]">
          <p className="mb-3 min-h-9 text-sm text-fog">
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
          >
            <FleetOverlay placements={playerBoard.placements} className="z-0 text-chalk/45" />
          </Grid>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-5">
          <fieldset>
            <legend className="mb-2 font-mono text-[0.65rem] tracking-[0.2em] text-fog uppercase">
              Orientation
            </legend>
            <div className="flex gap-2">
              {(['horizontal', 'vertical'] as const).map((option) => (
                <CommandButton
                  key={option}
                  pressed={option === orientation}
                  onClick={() => dispatch({ type: 'setOrientation', orientation: option })}
                  className="flex-1"
                >
                  {option}
                </CommandButton>
              ))}
            </div>
          </fieldset>

          <div>
            <h2 className="mb-2 font-mono text-[0.65rem] tracking-[0.2em] text-fog uppercase">
              Fleet
            </h2>
            <FleetList
              board={playerBoard}
              selectedShipId={selectedShipId}
              onSelect={(shipId: ShipId) => dispatch({ type: 'selectShip', shipId })}
              onRemove={(shipId: ShipId) => dispatch({ type: 'removeShip', shipId })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <CommandButton
                onClick={() => dispatch({ type: 'randomizeFleet' })}
                className="flex-1"
              >
                Random fleet
              </CommandButton>
              <CommandButton onClick={() => dispatch({ type: 'clearFleet' })} className="flex-1">
                Clear
              </CommandButton>
            </div>

            <CommandButton
              disabled={!fleetComplete}
              onClick={() => dispatch({ type: 'startGame' })}
              className="py-3"
            >
              Start battle
            </CommandButton>
            {fleetComplete ? null : (
              <p className="text-xs text-fog">All five ships must be placed first.</p>
            )}
          </div>
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
  if (inPreview) return previewIsLegal ? 'bg-chalk/30' : 'bg-ember/50'
  if (hasShip) return 'bg-chalk/8 hover:bg-chalk/15'
  return 'bg-ink hover:bg-chalk/10'
}
