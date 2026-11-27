import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("visitor can choose a persistent theme, pause motion and close controls by keyboard", async ({ page }, info) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-store-theme", "midnight");
  const trigger = page.getByLabel("รูปแบบและเอฟเฟกต์หน้าเว็บ", { exact: true });
  await trigger.click();
  const aurora = page.getByRole("button", { name: /Aurora/ });
  await aurora.click();
  await expect(aurora).toHaveAttribute("aria-pressed", "true");
  await expect(html).toHaveAttribute("data-store-theme", "aurora");
  await page.getByRole("button", { name: "หยุดเอฟเฟกต์", exact: true }).click();
  await expect(html).toHaveAttribute("data-store-motion", "off");
  const widths = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
    panel: document.querySelector(".display-panel")!.getBoundingClientRect().toJSON(),
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 2);
  expect(widths.panel.left).toBeGreaterThanOrEqual(0);
  expect(widths.panel.right).toBeLessThanOrEqual(widths.viewport + 1);
  mkdirSync("test-results/premium/store126-screens", { recursive: true });
  const device = info.project.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-$/, "");
  await page.screenshot({ path: `test-results/premium/store126-screens/${device}-aurora-display-controls.png`, animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".display-controls")).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(html).toHaveAttribute("data-store-theme", "aurora");
  await expect(html).toHaveAttribute("data-store-motion", "off");
  await trigger.click();
  await page.getByRole("button", { name: "คืนค่าเริ่มต้น", exact: true }).click();
  await expect(html).toHaveAttribute("data-store-theme", "midnight");
  await expect(html).toHaveAttribute("data-store-motion", "on");
});

test("device reduced-motion preference disables animation and back-to-top works", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-store-motion", "off");
  await page.getByLabel("รูปแบบและเอฟเฟกต์หน้าเว็บ", { exact: true }).click();
  await expect(page.getByRole("button", { name: "ภาพนิ่งตามการตั้งค่าอุปกรณ์", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.scrollTo(0, 1200));
  const top = page.getByRole("button", { name: "กลับด้านบน", exact: true });
  await expect(top).toBeVisible();
  const box = await top.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y).toBeGreaterThan(viewport.height - 100);
  expect(box!.x).toBeGreaterThan(viewport.width - 100);
  await top.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});


test("narrow phones keep preference and navigation menus within the viewport", async ({ page }, info) => {
  test.skip(info.project.name !== "Desktop Chromium", "Additional 320px boundary case uses the same Chromium engine");
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  const trigger = page.getByLabel("รูปแบบและเอฟเฟกต์หน้าเว็บ", { exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const panel = page.locator(".display-panel");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(321);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Midnight Gold/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.getByLabel("เปิดเมนู", { exact: true }).click();
  const menu = page.locator(".mobile-menu nav");
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
});
