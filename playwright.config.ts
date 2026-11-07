import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? process.env.PORT ?? 5173);
// Match Vite's default host (`localhost`) so reuseExistingServer works on Windows.
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run dev -- --port ${port} --strictPort`,
    url: baseURL,
    // Local `bd` / vite often already holds 5173; reuse it. CI always boots fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
