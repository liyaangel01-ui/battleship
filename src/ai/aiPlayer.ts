import {
  allCoordinates,
  coordinateKey,
  isInsideBoard,
  orthogonalNeighbours,
} from '../domain/coordinates.ts'
import { pick, type Rng } from '../domain/rng.ts'
import type { Coordinate } from '../domain/types.ts'
import type { OpponentView } from '../domain/view.ts'

/**
 * The AI opponent: "hunt and target".
 *
 * While it has no damaged ship to chase it *hunts*, firing at random squares on a
 * checkerboard pattern. Once it has a hit it *targets*, working outwards from the damage
 * and then following the ship's axis once it knows which way the ship runs.
 *
 * Two properties are worth calling out:
 *
 * 1. It is a pure function of the shot history. There is no AI memory stored anywhere, so
 *    there is nothing that can fall out of step with the board — the state is recomputed by
 *    replaying the history each turn. That removes the most likely source of AI bugs.
 * 2. It only ever receives an `OpponentView`, which is the attacker's own shot history. It
 *    has no access to ship positions, so it cannot cheat even by accident.
 */
export function nextShot(view: OpponentView, rng: Rng): Coordinate {
  const fired = new Set(view.shots.map((shot) => coordinateKey(shot.coordinate)))
  const unfired = allCoordinates().filter((coordinate) => !fired.has(coordinateKey(coordinate)))

  if (unfired.length === 0) {
    throw new Error('The AI was asked to fire with no squares left')
  }

  const targets = targetCandidates(view, fired)
  const choice = pick(targets.length > 0 ? targets : huntCandidates(unfired), rng)

  // `pick` only returns undefined for an empty list, and both lists above are non-empty by
  // construction. The check keeps the guarantee visible rather than assumed.
  if (!choice) throw new Error('The AI failed to choose a square')
  return choice
}

/**
 * Squares worth firing at because a ship is known to be damaged nearby.
 *
 * Hits belonging to ships that have already sunk are discarded, so the AI does not keep
 * attacking wreckage.
 */
function targetCandidates(view: OpponentView, fired: ReadonlySet<string>): Coordinate[] {
  const openHits = unsunkHits(view)
  if (openHits.length === 0) return []

  const cluster = largestCluster(openHits)
  const unfiredOnly = (coordinates: readonly Coordinate[]) =>
    coordinates.filter((coordinate) => !fired.has(coordinateKey(coordinate)))

  // Two hits in a line reveal the ship's axis, so extend from the ends of that line.
  const alongAxis = unfiredOnly(axisExtensions(cluster))
  if (alongAxis.length > 0) return alongAxis

  return unfiredOnly(cluster.flatMap(orthogonalNeighbours))
}

/**
 * Hunting fires only at squares where `(row + col)` is even.
 *
 * The shortest ship is two squares long, so it must cover at least one square of that
 * checkerboard: skipping the other half cannot miss a ship, and roughly halves the number
 * of shots needed to find one. If the pattern is exhausted, any remaining square will do.
 */
function huntCandidates(unfired: readonly Coordinate[]): Coordinate[] {
  const onParity = unfired.filter(({ row, col }) => (row + col) % 2 === 0)
  return onParity.length > 0 ? onParity : [...unfired]
}

/**
 * Hit squares that cannot be accounted for by a ship that has already sunk.
 *
 * The history is replayed in order. A sinking removes the connected group of damage it
 * belongs to. Where two ships lie against each other this can discard a neighbour's damage
 * too; the AI then rediscovers it while hunting, which costs a few shots but never
 * correctness.
 */
function unsunkHits(view: OpponentView): Coordinate[] {
  return view.shots.reduce<Coordinate[]>((hits, shot) => {
    if (shot.result.kind === 'miss') return hits
    if (shot.result.kind === 'hit') return [...hits, shot.coordinate]

    const sunkGroup = new Set(
      connectedGroup([...hits, shot.coordinate], shot.coordinate).map(coordinateKey),
    )
    return hits.filter((hit) => !sunkGroup.has(coordinateKey(hit)))
  }, [])
}

/** The group of mutually adjacent coordinates containing `start`. */
function connectedGroup(coordinates: readonly Coordinate[], start: Coordinate): Coordinate[] {
  const remaining = new Map(
    coordinates.map((coordinate) => [coordinateKey(coordinate), coordinate]),
  )
  const group: Coordinate[] = []
  const queue: Coordinate[] = [start]

  while (queue.length > 0) {
    const current = queue.pop()
    if (!current) break

    const key = coordinateKey(current)
    if (!remaining.has(key)) continue

    remaining.delete(key)
    group.push(current)
    queue.push(...orthogonalNeighbours(current))
  }

  return group
}

/** The largest group of adjacent hits: the ship the AI has learned the most about. */
function largestCluster(hits: readonly Coordinate[]): Coordinate[] {
  const clusters: Coordinate[][] = []
  const claimed = new Set<string>()

  for (const hit of hits) {
    if (claimed.has(coordinateKey(hit))) continue

    const cluster = connectedGroup(hits, hit)
    for (const cell of cluster) claimed.add(coordinateKey(cell))
    clusters.push(cluster)
  }

  return clusters.reduce<Coordinate[]>(
    (largest, cluster) => (cluster.length > largest.length ? cluster : largest),
    [],
  )
}

/**
 * The squares immediately beyond each end of a straight line of hits.
 * Returns nothing for a single hit or a group that is not in a straight line, in which case
 * the caller falls back to probing all around the damage.
 */
function axisExtensions(cluster: readonly Coordinate[]): Coordinate[] {
  if (cluster.length < 2) return []

  const rows = cluster.map((cell) => cell.row)
  const cols = cluster.map((cell) => cell.col)
  const isHorizontal = rows.every((row) => row === rows[0])
  const isVertical = cols.every((col) => col === cols[0])

  if (isHorizontal) {
    const row = rows[0]
    if (row === undefined) return []
    return [
      { row, col: Math.min(...cols) - 1 },
      { row, col: Math.max(...cols) + 1 },
    ].filter(isInsideBoard)
  }

  if (isVertical) {
    const col = cols[0]
    if (col === undefined) return []
    return [
      { row: Math.min(...rows) - 1, col },
      { row: Math.max(...rows) + 1, col },
    ].filter(isInsideBoard)
  }

  return []
}
