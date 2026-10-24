import { expect, test } from '@playwright/test';
import { MORNING, answer, mockDaily, startDaily } from './helpers';

test('shows "sedang disiapkan" when today has not been published', async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await mockDaily(page, { missing: true });
  await page.goto('/');
  await expect(page.getByText('Soal hari ini sedang disiapkan, coba lagi sebentar.')).toBeVisible();
});

test('still playable when localStorage is blocked, with a warning', async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await mockDaily(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByText('Progres tidak tersimpan')).toBeVisible();
  await startDaily(page);
  await answer(page, 'merah');
  await expect(page.getByText('BASECAMP', { exact: true })).toBeVisible();
});

test('uses the WIB date, not the device time zone', async ({ browser }) => {
  // 23:30 on 30 Nov in New York is already 11:30 on 1 Dec in WIB.
  const context = await browser.newContext({ timezoneId: 'America/New_York' });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-12-01T04:30:00Z') });
  const requested: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/daily/')) requested.push(new URL(r.url()).pathname);
  });
  await mockDaily(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Muncak Harian/ })).toBeVisible();
  expect(requested).toContain('/daily/2026-12-01.json');
  await context.close();
});

test('settings: toggles persist and "Hapus data saya" clears progress', async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await mockDaily(page);
  await page.goto('/');
  await startDaily(page);
  await answer(page, 'merah');
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Lanjutkan/ })).toBeVisible();

  await page.getByRole('button', { name: /Pengaturan/ }).click();
  const contrast = page.getByRole('switch', { name: /Kontras tinggi/ });
  await contrast.click();
  await expect(contrast).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');

  await page.getByRole('button', { name: /Pengaturan/ }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Hapus data saya' }).click();
  await expect(page.getByRole('button', { name: /Muncak Harian/ })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'normal');
});
