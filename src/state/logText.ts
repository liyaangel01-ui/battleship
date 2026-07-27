import { formatCoordinate } from '../domain/coordinates.ts'
import { shipName } from '../domain/shots.ts'
import type { LogEntry } from './gameState.ts'

/**
 * The sentence shown and announced for one shot.
 *
 * It lives next to the log rather than in a component because the wording carries the rules:
 * a hit says only that something was hit, while a sinking shot names the ship — which is
 * exactly what the players are entitled to know.
 */
export function describeShot(entry: LogEntry): string {
  const where = formatCoordinate(entry.coordinate)
  const sunkShip = entry.shipId ? shipName(entry.shipId) : 'ship'

  if (entry.by === 'player') {
    if (entry.outcome === 'miss') return `You fired at ${where} — miss.`
    if (entry.outcome === 'hit') return `You hit a ship at ${where}.`
    return `You sank the opponent's ${sunkShip} at ${where}.`
  }

  if (entry.outcome === 'miss') return `The opponent fired at ${where} — miss.`
  if (entry.outcome === 'hit') return `The opponent hit one of your ships at ${where}.`
  return `The opponent sank your ${sunkShip} at ${where}.`
}
