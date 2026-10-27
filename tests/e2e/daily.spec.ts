import { expect, test } from '@playwright/test';
import { MORNING, answer, mockDaily, next, startDaily, stubShare } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await mockDaily(page);
  await stubShare(page);
});

test('plays a full day: correct, rejected, unknown, timeout, result and share', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MUNCAK' })).toBeVisible();
  await expect(page.getByText('#1 · 7 soal')).toBeVisible();
  await startDaily(page);

  // 1. Edelweiss
  await expect(page.getByText('Soal 1/7')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sebutkan warna pelangi' })).toBeVisible();
  await answer(page, 'Warna Nila');
  await expect(page.getByText('EDELWEISS', { exact: true })).toBeVisible();
  await expect(page.getByText('Edelweiss! Cukup difoto, jangan dipetik 🌼')).toBeVisible();
  await expect(page.getByText('Kamu menemukan Edelweiss!')).toBeVisible();
  await expect(page.getByText('+100')).toBeVisible();
  await next(page);

  // 2. Unknown first (costs 2 s), then Basecamp
  await expect(page.getByText('Soal 2/7')).toBeVisible();
  await answer(page, 'Selasaa Rabu');
  await expect(page.getByText('Belum ada di daftar kami. Coba yang lain?')).toBeVisible();
  await expect(page.getByText('−2 dtk')).toBeVisible();
  await answer(page, 'senin');
  await expect(page.getByText('BASECAMP', { exact: true })).toBeVisible();
  await expect(page.getByText('Aman! Semua orang juga kepikiran ini.')).toBeVisible();
  await next(page);

  // 3. Rejected with its reason, then a typo that is still accepted (Puncak)
  await answer(page, 'Pluto');
  await expect(page.getByText('Sejak 2006 Pluto digolongkan sebagai planet kerdil.')).toBeVisible();
  await answer(page, 'Neptunis');
  await expect(page.getByText('PUNCAK', { exact: true })).toBeVisible();
  await expect(page.getByText('"Neptunus"')).toBeVisible();
  await next(page);

  // 4. Basecamp
  await answer(page, 'Pensil');
  await expect(page.getByText('+10')).toBeVisible();
  await next(page);

  // 5. Time runs out → Kabut
  await expect(page.getByText('Soal 5/7')).toBeVisible();
  await page.clock.fastForward(26_000);
  await expect(page.getByText('Kabut turun! 🌫️')).toBeVisible();
  await next(page);

  // 6 & 7. Edelweiss twice
  await answer(page, 'cempedak');
  await expect(page.getByText('Kamu menemukan Edelweiss!')).toBeVisible();
  await next(page);
  await answer(page, 'sasando');
  await expect(page.getByRole('button', { name: /Lihat hasil/ })).toBeVisible();
  await next(page);

  // 100 + 10 + 85 + 10 + 0 + 100 + 100 = 405 points = 2.835 mdpl → Gunung Prau, Anak Gunung
  await expect(page.getByText('2.835 mdpl').first()).toBeVisible();
  await expect(page.getByText('▲ GUNUNG PRAU')).toBeVisible();
  await expect(page.getByText('Anak Gunung')).toBeVisible();
  // Started 10:00 WIB; a minute or so of (fake) time has passed since.
  await expect(page.getByText(/Soal baru dalam 13:5\d:\d\d/)).toBeVisible();

  await page.getByRole('button', { name: 'Salin hasil' }).click();
  await expect(page.getByText('Hasil disalin!')).toBeVisible();
  const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
  expect(copied[0]).toBe(
    `Muncak #1 🏔️\n2.835 mdpl · Prau\n🌼🥾🏔️🥾🌫️🌼🌼\n${new URL(page.url()).origin}/`,
  );
  // The share text never leaks answers.
  expect(copied[0]).not.toMatch(/nila|senin|neptunus|pensil|cempedak|sasando/i);

  // Share falls back to the clipboard when Web Share and wa.me are unavailable.
  await page.getByRole('button', { name: /Bagikan ke WA/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.length))
    .toBe(2);

  // Stats were recorded.
  await page.getByRole('button', { name: 'Statistik' }).click();
  await expect(page.getByRole('heading', { name: 'Statistik' })).toBeVisible();
  await expect(page.getByText('2.835 mdpl · Gunung Prau')).toBeVisible();
  await expect(page.getByText('🌼 × 3')).toBeVisible();

  // Coming back the same day: no replay.
  await page.reload();
  await expect(
    page.getByText('Kamu sudah muncak hari ini. Sampai jumpa besok pagi!'),
  ).toBeVisible();
  await expect(page.getByText('🔥 Streak 1 hari')).toBeVisible();
  await page.getByRole('button', { name: /Lihat hasil/ }).click();
  await expect(page.getByText('▲ GUNUNG PRAU')).toBeVisible();
});

test('refreshing mid-round keeps the timer running from startedAt', async ({ page }) => {
  await page.goto('/');
  await startDaily(page);
  await expect(page.getByText('Soal 1/7')).toBeVisible();
  await page.clock.runFor(10_000);
  await page.reload();
  await page.getByRole('button', { name: /Lanjutkan/ }).click();
  await expect(page.getByText('Soal 1/7')).toBeVisible();
  // The clock kept running during the reload: at most 15 s left, never reset to 25.
  const timer = await page.locator('.timer').textContent();
  const left = Number(/00:(\d\d)/.exec(timer ?? '')?.[1]);
  expect(left).toBeGreaterThan(0);
  expect(left).toBeLessThanOrEqual(15);
  // Still the same round, and it times out on schedule.
  await page.clock.runFor((left + 1) * 1000);
  await expect(page.getByText('Kabut turun! 🌫️')).toBeVisible();
});

test('a round that expired while the tab was closed becomes Kabut', async ({ page }) => {
  await page.goto('/');
  await startDaily(page);
  await expect(page.getByText('Soal 1/7')).toBeVisible();
  await page.goto('about:blank');
  await page.clock.fastForward('05:00');
  await page.goto('/');
  await page.getByRole('button', { name: /Lanjutkan/ }).click();
  await expect(page.getByText('Kabut turun! 🌫️')).toBeVisible();
});

test('keyboard-only play works (desktop)', async ({ page }) => {
  await page.goto('/');
  await startDaily(page);
  await expect(page.getByLabel('Jawaban kamu')).toBeFocused();
  await page.keyboard.type('merah');
  await page.keyboard.press('Enter');
  await expect(page.getByText('BASECAMP', { exact: true })).toBeVisible();
  await page.clock.runFor(500);
  await expect(page.getByRole('button', { name: /Lanjut/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Soal 2/7')).toBeVisible();
});
