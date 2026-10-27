import { expect, test } from '@playwright/test';
import { ALL_BASECAMP, MORNING, answer, mockBank, mockDaily, next } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: MORNING });
  // Keep the Ekspedisi shuffle in file order so the test knows the prompts.
  await page.addInitScript(() => {
    Math.random = () => 0.999999;
  });
  await mockDaily(page);
});

test('Ekspedisi: bonus, skip, logistics running out, and a record', async ({ page }) => {
  await mockBank(page);
  await page.goto('/');
  // Phase 1 build: no backend, so no Rombongan.
  await expect(page.getByRole('button', { name: /Rombongan/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Ekspedisi/ }).click();
  await expect(page.getByText('Belum ada rekor. Ayo berangkat!')).toBeVisible();
  await page.getByRole('button', { name: /Mulai ekspedisi/ }).click();

  await expect(page.getByRole('heading', { name: 'Sebutkan warna pelangi' })).toBeVisible();
  await expect(page.getByText(/Logistik 00:45/)).toBeVisible();
  await answer(page, 'nila');
  await expect(page.getByText(/\+16 dtk/)).toBeVisible();
  await expect(page.getByText('700 mdpl').first()).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Sebutkan hari dalam seminggu' })).toBeVisible();
  await answer(page, 'coklat');
  await expect(page.getByText('Belum ada di daftar kami. Coba yang lain?')).toBeVisible();
  await page.getByRole('button', { name: /Lewati/ }).click();
  await expect(page.getByText('Soal dilewati.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sebutkan planet di tata surya' })).toBeVisible();

  // 45 + 16 − 2 − 3 = 56 s of logistics in total.
  await page.clock.fastForward(60_000);
  await expect(page.getByText('Logistik habis!')).toBeVisible();
  await expect(page.getByText('Rekor baru!')).toBeVisible();
  await expect(page.getByText('1 soal terjawab')).toBeVisible();

  await page.getByRole('button', { name: 'Kembali', exact: true }).click();
  await page.getByRole('button', { name: /Ekspedisi/ }).click();
  await expect(page.getByText('Rekor kamu: 700 mdpl')).toBeVisible();
});

test('Ekspedisi without bank prompts says so', async ({ page }) => {
  await mockBank(page, { empty: true });
  await page.goto('/');
  await page.getByRole('button', { name: /Ekspedisi/ }).click();
  await expect(page.getByText('Belum ada soal Ekspedisi. Nanti dicek lagi, ya.')).toBeVisible();
});

test('Paket Tema: seasonal filter, a full pack, best score kept', async ({ page }) => {
  await mockBank(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Paket/ }).click();
  await expect(page.getByText('Paket Contoh')).toBeVisible();
  // 17 Agustus is out of season on 1 December.
  await expect(page.getByText('Paket 17 Agustus')).toHaveCount(0);
  await expect(page.getByText('Belum dimainkan')).toBeVisible();

  await page.getByRole('button', { name: /Paket Contoh/ }).click();
  for (const a of ALL_BASECAMP) {
    await answer(page, a);
    await expect(page.getByText('BASECAMP', { exact: true })).toBeVisible();
    await next(page);
  }
  await expect(page.getByText('490 mdpl').first()).toBeVisible();
  await expect(page.getByText('Skor terbaik baru!')).toBeVisible();

  // Replayable; abandoning a replay keeps the best score.
  await page.getByRole('button', { name: /Main lagi/ }).click();
  await expect(page.getByText('Soal 1/7')).toBeVisible();
  await page.clock.fastForward(26_000);
  await expect(page.getByText('Kabut turun! 🌫️')).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: /Paket/ }).click();
  await expect(page.getByText('Terbaik: 490 mdpl')).toBeVisible();

  // Paket Tema never touches today's Muncak Harian.
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Muncak Harian/ })).toBeVisible();
});
