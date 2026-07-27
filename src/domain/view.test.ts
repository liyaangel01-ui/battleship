import { describe, expect, it } from 'vitest'

import { at, boardWith, fireAll, placement } from './testFixtures.ts'
import { opponentView } from './view.ts'

describe('opponentView', () => {
  it('reports each shot in the order it was fired', () => {
    const board = fireAll(boardWith(placement('destroyer', 'B2', 'horizontal')), 'J10', 'B2')

    expect(opponentView(board).shots.map((shot) => shot.coordinate)).toEqual([at('J10'), at('B2')])
  })

  it('does not reveal which ship a hit belongs to until that ship sinks', () => {
    const board = fireAll(boardWith(placement('destroyer', 'B2', 'horizontal')), 'B2')

    expect(opponentView(board).shots.map((shot) => shot.result)).toEqual([{ kind: 'hit' }])
  })

  it('names the ship on the shot that sinks it, and only then', () => {
    const board = fireAll(boardWith(placement('destroyer', 'B2', 'horizontal')), 'B2', 'C2')

    expect(opponentView(board).shots.map((shot) => shot.result)).toEqual([
      { kind: 'hit' },
      { kind: 'sunk', shipId: 'destroyer' },
    ])
  })

  it('reports what the attacker was told at the time, not with hindsight', () => {
    // The first shot was a plain hit when it was fired; it must not be relabelled "sunk"
    // just because the ship went down later.
    const board = fireAll(boardWith(placement('cruiser', 'A1', 'vertical')), 'A1', 'A2', 'A3')
    const results = opponentView(board).shots.map((shot) => shot.result.kind)

    expect(results).toEqual(['hit', 'hit', 'sunk'])
  })

  it('exposes no ship positions for ships that are still afloat', () => {
    const board = boardWith(placement('carrier', 'A1', 'horizontal'))
    const view = opponentView(board)

    expect(JSON.stringify(view)).not.toContain('carrier')
    expect(view.shots).toEqual([])
  })
})
