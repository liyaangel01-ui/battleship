import { expect, test } from '@playwright/test'

test('the application loads and shows the game title', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Battleship' })).toBeVisible()
})
