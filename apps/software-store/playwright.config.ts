import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    ...(process.env.PLAYWRIGHT_PROXY_SERVER
      ? { proxy: { server: process.env.PLAYWRIGHT_PROXY_SERVER } }
      : {}),
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Desktop Chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "iPhone layout (Chromium)",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "Android layout",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "Tablet layout",
      use: {
        ...devices["iPad (gen 7)"],
        defaultBrowserType: "chromium",
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
            "/usr/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
  ],
});
