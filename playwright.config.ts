import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for BestilleHelikopter.no E2E tests.
 *
 * Forutsetter at dev-serveren og Firebase-emulatorene kjører:
 *   npm run dev                          (port 3000)
 *   firebase emulators:start             (ports 9099, 8080, 9199, 5001)
 *
 * Kjør tester:
 *   npx playwright test
 *   npx playwright test --ui             (interaktiv)
 *   npx playwright test e2e/smoke.spec.ts
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // sequential — testene deler Firestore-state
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Bruk systemets Chrome hvis Playwright-browser ikke er installert
        channel: "chrome",
      },
    },
  ],

  // Start dev-server automatisk hvis den ikke kjører
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

