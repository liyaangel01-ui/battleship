import { describe, expect, it } from 'vitest'

import { boardCells } from './cells.ts'
import { coordinateKey } from './coordinates.ts'
import { at, boardWith, fireAll, placement } from './testFixtures.ts'

const fleet = () => boardWith(placement('destroyer', 'B2', 'horizontal'))

/** The state of one labelled square. */
function state(board: Parameters<typeof boardCells>[0], label: string, revealShips: boolean) {
  return boardCells(board, revealShips).get(coordinateKey(at(label)))
}

describe('boardCells with ships hidden (the opponent board)', () => {
  it('shows nothing at all about squares that have not been fired at', () => {
    expect(state(fleet(), 'B2', false)).toBe('unknown')
    expect(state(fleet(), 'J10', false)).toBe('unknown')
  })

  it('marks a shot into empty water as a miss', () => {
    expect(state(fireAll(fleet(), 'J10'), 'J10', false)).toBe('miss')
  })

  it('marks a shot into a ship as a hit while the ship is still afloat', () => {
    expect(state(fireAll(fleet(), 'B2'), 'B2', false)).toBe('hit')
  })

  it('marks every square of a ship as sunk once its last square is hit', () => {
    const sunk = fireAll(fleet(), 'B2', 'C2')

    expect(state(sunk, 'B2', false)).toBe('sunk')
    expect(state(sunk, 'C2', false)).toBe('sunk')
  })
})

describe('boardCells with ships shown (your own board)', () => {
  it('shows your ships and your empty water separately', () => {
    expect(state(fleet(), 'B2', true)).toBe('ship')
    expect(state(fleet(), 'J10', true)).toBe('water')
  })

  it('shows damage on top of your ships', () => {
    expect(state(fireAll(fleet(), 'B2'), 'B2', true)).toBe('hit')
    expect(state(fireAll(fleet(), 'B2'), 'C2', true)).toBe('ship')
  })

  it('never reports a square as unknown, because you can see your own waters', () => {
    const states = new Set(boardCells(fleet(), true).values())

    expect(states.has('unknown')).toBe(false)
  })
})

describe('boardCells overall', () => {
  it('describes all one hundred squares', () => {
    expect(boardCells(fleet(), false).size).toBe(100)
  })

  it('leaves a neighbouring ship undamaged when another one sinks', () => {
    const board = boardWith(
      placement('destroyer', 'B2', 'horizontal'),
      placement('cruiser', 'B3', 'horizontal'),
    )
    const sunkDestroyer = fireAll(board, 'B2', 'C2')

    expect(state(sunkDestroyer, 'B2', false)).toBe('sunk')
    expect(state(sunkDestroyer, 'B3', false)).toBe('unknown')
  })
})
