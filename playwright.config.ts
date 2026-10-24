import { defineConfig, devices } from '@playwright/test';

const PORT = 5179;
export const E2E_PAYLOAD_KEY = 'e2e-key';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 740 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile-chromium' }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // Real env vars win over .env files in Vite, so the tests know the payload key.
    env: { VITE_PAYLOAD_KEY: E2E_PAYLOAD_KEY },
  },
});
