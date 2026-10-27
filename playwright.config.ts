import { defineConfig, devices } from '@playwright/test';

const STATIC_PORT = 5179;
const API_PORT = 5180;
export const E2E_PAYLOAD_KEY = 'e2e-key';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 740 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // Phase 1 build: static daily files, no backend.
      name: 'static',
      testIgnore: /api\.spec\.ts/,
      use: { baseURL: `http://localhost:${STATIC_PORT}` },
    },
    {
      // Phase 2 build: VITE_API_BASE set; the tests route /api/v1 into the real Worker code.
      name: 'api',
      testMatch: /api\.spec\.ts/,
      use: { baseURL: `http://localhost:${API_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${STATIC_PORT} --strictPort`,
      url: `http://localhost:${STATIC_PORT}`,
      reuseExistingServer: !process.env.CI,
      // Real env vars win over .env files in Vite, so the tests know the payload key.
      env: { VITE_PAYLOAD_KEY: E2E_PAYLOAD_KEY, VITE_API_BASE: '' },
    },
    {
      command: `npx vite --port ${API_PORT} --strictPort`,
      url: `http://localhost:${API_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { VITE_PAYLOAD_KEY: E2E_PAYLOAD_KEY, VITE_API_BASE: '/api/v1' },
    },
  ],
});
