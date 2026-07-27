import { describe, expect, it } from 'vitest'

import { at } from '../domain/testFixtures.ts'
import type { LogEntry, Player } from './gameState.ts'
import { describeShot } from './logText.ts'

function entry(by: Player, outcome: LogEntry['outcome'], shipId?: LogEntry['shipId']): LogEntry {
  return { shotNumber: 1, by, coordinate: at('D4'), outcome, ...(shipId ? { shipId } : {}) }
}

describe('describeShot', () => {
  it('describes the player’s shots', () => {
    expect(describeShot(entry('player', 'miss'))).toBe('You fired at D-4 — miss.')
    expect(describeShot(entry('player', 'hit'))).toBe('You hit a ship at D-4.')
    expect(describeShot(entry('player', 'sunk', 'cruiser'))).toBe(
      "You sank the opponent's Cruiser at D-4.",
    )
  })

  it('describes the opponent’s shots', () => {
    expect(describeShot(entry('ai', 'miss'))).toBe('The opponent fired at D-4 — miss.')
    expect(describeShot(entry('ai', 'hit'))).toBe('The opponent hit one of your ships at D-4.')
    expect(describeShot(entry('ai', 'sunk', 'carrier'))).toBe(
      'The opponent sank your Carrier at D-4.',
    )
  })

  it('names no ship when a hit does not sink one, so nothing leaks', () => {
    expect(describeShot(entry('player', 'hit', 'carrier'))).not.toContain('Carrier')
  })
})
