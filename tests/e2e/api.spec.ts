import { expect, test, type Page } from '@playwright/test';
import { createBackend } from './backend';
import { ALL_BASECAMP, MORNING, answer, next, startDaily, stubShare } from './helpers';

async function playDay(page: Page, answers: string[] = ALL_BASECAMP, firstExtra: string[] = []) {
  await startDaily(page);
  for (const [i, a] of answers.entries()) {
    if (i === 0) for (const extra of firstExtra) await answer(page, extra);
    await answer(page, a);
    await next(page);
  }
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MORNING });
  await stubShare(page);
});

test('the finished day is scored by the server and shows up in a Rombongan', async ({
  page,
  browser,
}) => {
  const backend = createBackend();
  await backend.attach(page.context());
  await page.goto('/');
  await expect(page.getByText('#12 · 7 soal')).toBeVisible(); // day number from the Worker
  await playDay(page, ['nila', ...ALL_BASECAMP.slice(1)]);
  await expect(page.getByText('1.120 mdpl').first()).toBeVisible();
  await expect
    .poll(() => backend.db.rows('SELECT altitude FROM daily_scores'))
    .toEqual([{ altitude: 1120 }]);

  // Create a Rombongan from the result screen.
  await page.getByRole('button', { name: 'Rombongan' }).click();
  await page.getByLabel('Nama Rombongan').fill('Anak IF 2024');
  await page.getByLabel('Nama panggilan').first().fill('Rina');
  await page.getByRole('button', { name: 'Bikin Rombongan' }).click();
  await expect(page.getByRole('heading', { name: 'Anak IF 2024' })).toBeVisible();
  await expect(page.getByText('Rina (Kamu)')).toBeVisible();
  await expect(page.getByText('1.120 mdpl · Nglanggeran')).toBeVisible();
  await expect(page.getByText('🌼 Edelweiss hari ini: Rina')).toBeVisible();
  const code = (await page.locator('.note', { hasText: 'MCK-' }).textContent())!.match(
    /MCK-[0-9A-Z]{4}/,
  )![0];

  await page.getByRole('button', { name: /Bagikan link grup/ }).click();
  const copied = await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);
  expect(copied.at(-1)).toContain(`/r/${code}`);

  // A friend on another phone opens the link: join, but no spoilers before playing.
  const friendCtx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await backend.attach(friendCtx);
  const friend = await friendCtx.newPage();
  await friend.clock.install({ time: MORNING });
  await friend.goto(`/r/${code}`);
  await expect(friend.getByText('Gabung ke "Anak IF 2024"')).toBeVisible();
  await expect(friend.getByText(`${code} · 1 anggota`)).toBeVisible();
  await friend.getByLabel('Nama panggilan').fill('Dodi');
  await friend.getByRole('button', { name: 'Gabung' }).click();
  await expect(friend.getByText('Dodi (Kamu)')).toBeVisible();
  await expect(
    friend.getByText('Skor teman terlihat setelah kamu menyelesaikan Muncak Harian hari ini.'),
  ).toBeVisible();
  await expect(friend.getByText('1.120 mdpl')).toHaveCount(0);
  expect(new URL(friend.url()).pathname).toBe('/');

  // After playing, the friend sees the standings.
  await friend.getByRole('button', { name: /Kembali/ }).click();
  await friend.getByRole('button', { name: /Kembali/ }).click();
  await playDay(friend);
  await friend.getByRole('button', { name: 'Rombongan' }).click();
  await friend.getByRole('button', { name: /Anak IF 2024/ }).click();
  await expect(friend.getByText('1.120 mdpl · Nglanggeran')).toBeVisible();
  await expect(friend.getByText('490 mdpl · Basecamp')).toBeVisible();
  await friend.getByRole('tab', { name: 'Minggu ini' }).click();
  await expect(friend.getByText('1.120 mdpl')).toBeVisible();
  await friendCtx.close();
});

test('rude nicknames are refused with a friendly message', async ({ page }) => {
  const backend = createBackend();
  await backend.attach(page.context());
  await page.goto('/');
  await page.getByRole('button', { name: /Rombongan/ }).click();
  await page.getByLabel('Nama Rombongan').fill('Kelas');
  await page.getByLabel('Nama panggilan').first().fill('b4ngsat');
  await page.getByRole('button', { name: 'Bikin Rombongan' }).click();
  await expect(page.getByText('Pilih nama lain yang lebih sopan, ya.')).toBeVisible();
});

test('an unknown answer can be suggested to the editors', async ({ page }) => {
  const backend = createBackend();
  await backend.attach(page.context());
  await page.goto('/');
  await startDaily(page);
  await answer(page, 'Magenta');
  await expect(page.getByText('Belum ada di daftar kami. Coba yang lain?')).toBeVisible();
  await answer(page, 'merah');
  await page.getByRole('button', { name: 'Usulkan "Magenta"' }).click();
  await expect(page.getByText('Terkirim, makasih! Editor akan meninjaunya.')).toBeVisible();
  expect(backend.db.rows('SELECT input_norm FROM suggestions')).toEqual([
    { input_norm: 'magenta' },
  ]);
});

test('a play sent while offline is delivered later', async ({ page }) => {
  const backend = createBackend();
  let offline = true;
  await backend.attach(page.context(), { failPlays: () => offline });
  await page.goto('/');
  await playDay(page);
  await expect(page.getByText('490 mdpl').first()).toBeVisible();
  expect(backend.db.rows('SELECT * FROM daily_scores')).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('muncak:v1:pending-play'))).not.toBeNull();

  offline = false;
  await page.reload();
  await expect
    .poll(() => backend.db.rows('SELECT altitude FROM daily_scores'))
    .toEqual([{ altitude: 490 }]);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('muncak:v1:pending-play')))
    .toBe('null');
});

test('"Hapus data saya" also deletes the server data', async ({ page }) => {
  const backend = createBackend();
  await backend.attach(page.context());
  await page.goto('/');
  await playDay(page);
  await expect.poll(() => backend.db.rows('SELECT * FROM daily_scores').length).toBe(1);

  await page.getByRole('button', { name: 'Beranda' }).click();
  await page.getByRole('button', { name: /Pengaturan/ }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Hapus data saya' }).click();
  await expect(page.getByRole('button', { name: /Muncak Harian/ })).toBeVisible();
  expect(backend.db.rows('SELECT * FROM daily_scores')).toHaveLength(0);
});
