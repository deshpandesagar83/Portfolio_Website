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
    await expect(comments.locator('form')).toHaveCount(0);
    await expect(comments.locator('input, textarea, button')).toHaveCount(0);
  });

  test('serves a 404 page in the export', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'does not exist',
    );
  });
});

test.describe('desktop navigation', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop menu is hidden on mobile');

  test('scrolls to a section and marks its menu item current', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Section navigation' });
    await nav.getByRole('link', { name: 'Comments' }).click();

    await expect(page.locator('#comments')).toBeInViewport();
    await expect(nav.getByRole('link', { name: 'Comments' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'toggle only exists on mobile');

  test('opens the menu, navigates, and closes it', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile section navigation',
    });
    await expect(mobileNav).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Comments' }).click();

    await expect(page.locator('#comments')).toBeInViewport();
    await expect(mobileNav).toHaveCount(0);
  });
});
