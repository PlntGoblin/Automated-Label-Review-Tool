import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// axe-core a11y scans on key UI states.
// The demo scenarios let us reach results views without a running backend.

test.describe('Accessibility — axe-core scans', () => {
  test('landing page — empty form (single tab)', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.alrt-header')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('landing page — batch tab', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('tab', { name: /Batch Upload/i }).click()
    await page.waitForSelector('[role="tabpanel"]')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('results view — all fields pass (demo)', async ({ page }) => {
    await page.goto('/')
    await page.getByText('All Fields Pass').click()
    await page.waitForSelector('.summary-bar')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('results view — flagged fields (demo)', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Brand & ABV Flagged').click()
    await page.waitForSelector('.summary-bar')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('results view — degraded / low confidence (demo)', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Degraded Label').click()
    await page.waitForSelector('.summary-bar')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
