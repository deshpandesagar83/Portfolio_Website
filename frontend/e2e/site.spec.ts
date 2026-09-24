import { test, expect } from '@playwright/test';

test.describe('portfolio site, served from the static export', () => {
  test('loads with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.locator('#hero')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('shows the hero content and exactly one h1', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#hero img').first()).toBeVisible();
  });

  test('shows the comments placeholder with no form', async ({ page }) => {
    await page.goto('/');

    const comments = page.locator('#comments');
    await expect(comments).toBeAttached();
    await expect(comments.getByText('Coming soon')).toBeAttached();
    await expect(
      comments.locator(
        'form, input, textarea, select, iframe, button, [contenteditable], [role="button"], [role="textbox"]',
      ),
    ).toHaveCount(0);
  });

  test('serves a 404 page in the export', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'does not exist',
    );
  });
});

test.describe('the workflow page', () => {
  test('loads with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/workflow/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('opens the first panel and collapses it on click', async ({ page }) => {
    // The disclosure is native <details>: this proves it works in the exported
    // bundle with none of our JavaScript.
    await page.goto('/workflow/');

    const panel = page.locator('details').first();
    await expect(panel).toHaveAttribute('open', '');

    await panel.locator('summary').click();
    await expect(panel).not.toHaveAttribute('open', '');
  });
});

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop menu is hidden on mobile');

  test('navigates between the two pages and marks the current one', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('link', { name: 'Workflow' }).click();

    await expect(page).toHaveURL(/\/workflow\/?$/);
    await expect(page.locator('#workflow')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Workflow' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await nav.getByRole('link', { name: 'Home' }).click();

    await expect(page.locator('#hero')).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'toggle only exists on mobile');

  test('opens the menu, navigates to Workflow, and closes', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNav).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Workflow' }).click();

    await expect(page).toHaveURL(/\/workflow\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(mobileNav).toHaveCount(0);
  });
});
