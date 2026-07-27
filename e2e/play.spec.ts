import { expect, test, type Locator, type Page } from '@playwright/test'

const waters = (page: Page, name: 'Opponent waters' | 'Your waters') =>
  page.getByRole('group', { name })

const square = (grid: Locator, label: string) =>
  grid.getByRole('button', { name: new RegExp(`^${label},`) })

const fleetAt = (firstRow: number) => ({
  placements: [
    { shipId: 'carrier', origin: { row: firstRow, col: 0 }, orientation: 'horizontal' },
    { shipId: 'battleship', origin: { row: firstRow + 1, col: 0 }, orientation: 'horizontal' },
    { shipId: 'cruiser', origin: { row: firstRow + 2, col: 0 }, orientation: 'horizontal' },
    { shipId: 'submarine', origin: { row: firstRow + 3, col: 0 }, orientation: 'horizontal' },
    { shipId: 'destroyer', origin: { row: firstRow + 4, col: 0 }, orientation: 'horizontal' },
  ],
  shots: [],
})

/**
 * The squares the opponent's fleet occupies in the seeded game below.
 *
 * A game can only be won by knowing where the enemy ships are, which a player never does — so
 * the browser is handed a known game through the same saved-game mechanism the app uses for
 * refreshes. Sinking the fleet then takes 17 shots instead of up to 100, which the opponent
 * would comfortably win first.
 */
const ENEMY_SQUARES = [
  'A-1',
  'B-1',
  'C-1',
  'D-1',
  'E-1',
  'A-2',
  'B-2',
  'C-2',
  'D-2',
  'A-3',
  'B-3',
  'C-3',
  'A-4',
  'B-4',
  'C-4',
  'A-5',
  'B-5',
]

/**
 * Opens a battle with both fleets in known positions.
 *
 * The game is written once and then loaded by a reload, rather than injected before every
 * navigation — otherwise the seed would also be re-written on the reload a later test performs,
 * and that test would be checking the seed rather than what the game saved.
 */
async function seedBattle(page: Page) {
  const state = {
    phase: 'playerTurn',
    playerBoard: fleetAt(5),
    aiBoard: fleetAt(0),
    log: [],
  }

  await page.goto('/')
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    ['battleship.game.v1', JSON.stringify(state)],
  )
  await page.reload()
}

test('placing a fleet by hand and firing the first shots', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /^Carrier,/ }).click()
  await page.getByRole('button', { name: 'Vertical' }).click()
  await square(waters(page, 'Your waters'), 'A-1').click()
  await expect(square(waters(page, 'Your waters'), 'A-5')).toHaveAccessibleName(/Carrier/)

  const start = page.getByRole('button', { name: 'Start battle' })
  await expect(start).toBeDisabled()

  await page.getByRole('button', { name: 'Random fleet' }).click()
  await expect(start).toBeEnabled()
  await start.click()

  const opponent = waters(page, 'Opponent waters')
  await square(opponent, 'J-10').click()

  await expect(square(opponent, 'J-10')).toBeDisabled()
  await expect(page.getByText(/^You (fired at|hit a ship at) J-10/)).toBeVisible()
  await expect(page.getByText(/^The opponent/)).toBeVisible()
  await expect(page.getByText('Your turn — pick a square in the opponent waters.')).toBeVisible()
})

test('sinking the enemy fleet ends the game and reveals it', async ({ page }) => {
  await seedBattle(page)

  const opponent = waters(page, 'Opponent waters')
  const yourTurn = page.getByText('Your turn — pick a square in the opponent waters.')
  const won = page.getByRole('heading', { name: 'You win — the enemy fleet is destroyed.' })

  for (const label of ENEMY_SQUARES) {
    if (await won.isVisible()) break
    await yourTurn.waitFor()
    await square(opponent, label).click()
  }

  await expect(won).toBeVisible()
  await expect(page.getByText("You sank the opponent's Destroyer at B-5.")).toBeVisible()
  await expect(page.getByText(/33 shots were fired in total/)).toBeVisible()
  await expect(square(opponent, 'A-1')).toHaveAccessibleName('A-1, Carrier sunk')

  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByRole('button', { name: 'Start battle' })).toBeDisabled()
})

test('an unfinished game survives a reload', async ({ page }) => {
  await seedBattle(page)

  const opponent = waters(page, 'Opponent waters')
  await square(opponent, 'J-10').click()
  await expect(page.getByText('Your turn — pick a square in the opponent waters.')).toBeVisible()

  await page.reload()

  await expect(opponent).toBeVisible()
  await expect(square(opponent, 'J-10')).toBeDisabled()
  await expect(page.getByText('You fired at J-10 — miss.')).toBeVisible()
})
