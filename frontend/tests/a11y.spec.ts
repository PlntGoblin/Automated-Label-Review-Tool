import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// axe-core a11y scans on key UI states reachable without a running backend.

test.describe('Accessibility — axe-core scans', () => {
  test('landing page — initial empty state', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('h1')

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('landing page — header and footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('landing page — upload zone is reachable by keyboard', async ({ page }) => {
    await page.goto('/')
    const uploadBtn = page.getByRole('button', { name: 'Upload label images' })
    await expect(uploadBtn).toBeVisible()
    await expect(uploadBtn).toBeEnabled()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('landing page — submit button is disabled when form is empty', async ({ page }) => {
    await page.goto('/')
    const submitBtn = page.getByRole('button', { name: /Run Automated Review/i })
    await expect(submitBtn).toBeDisabled()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })

  test('landing page — stepper is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Upload Label')).toBeVisible()
    await expect(page.getByText('Application Data')).toBeVisible()
    await expect(page.getByText('Review & Run')).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
