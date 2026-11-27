import { test, expect } from "@playwright/test";

test("home counters start on view and respect reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 360,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-store-motion", "on");
  const stats = page.getByRole("region", { name: "จำนวนระบบที่ตรวจสอบได้" });
  await expect(stats).toHaveAttribute("data-counter-phase", "ready");
  await stats.evaluate((element) => {
    const phases: string[] = [];
    (window as unknown as { counterPhases: string[] }).counterPhases = phases;
    new MutationObserver(() =>
      phases.push(element.getAttribute("data-counter-phase") || ""),
    ).observe(element, {
      attributes: true,
      attributeFilter: ["data-counter-phase"],
    });
  });
  await stats.scrollIntoViewIfNeeded();
  await expect(stats).toHaveAttribute("data-counter-phase", "complete");
  expect(
    await page.evaluate(
      () => (window as unknown as { counterPhases: string[] }).counterPhases,
    ),
  ).toContain("animating");
  const values = stats.locator('dd > span[aria-hidden="true"]');
  const totals = await values.allTextContents();
  expect(Number(totals[0].replaceAll(",", ""))).toBeGreaterThan(0);
  expect(totals.slice(1)).toEqual(["4", "2"]);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-store-motion",
    "off",
  );
  await stats.scrollIntoViewIfNeeded();
  await expect(stats).toHaveAttribute("data-counter-phase", "complete");
  expect(await values.allTextContents()).toEqual(totals);
});

test("feature tabs change screenshots without navigating and work with a keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const url = page.url();
  const navigations: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") navigations.push(request.url());
  });
  const tabs = page.getByRole("tablist", { name: "เลือกงานโรงเรียน" });
  await tabs.getByRole("tab", { name: "งานเว็บไซต์โรงเรียน" }).click();
  let panel = page.getByRole("tabpanel");
  await expect(
    panel.getByRole("heading", { name: "MET School Pro", exact: true }),
  ).toBeVisible();
  const image = panel.getByRole("img");
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  await tabs
    .getByRole("tab", { name: "งานเว็บไซต์โรงเรียน" })
    .press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "งานเช็กชื่อและติดตาม" }),
  ).toBeFocused();
  panel = page.getByRole("tabpanel");
  await expect(
    panel.getByRole("heading", { name: "MET Attendance", exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole("img")).toHaveAttribute("alt", /MET Attendance/);
  await page.getByRole("tab", { name: "งานเช็กชื่อและติดตาม" }).press("Home");
  await expect(
    page.getByRole("tab", { name: "งานรับสมัครนักเรียน" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(page.url()).toBe(url);
  expect(navigations).toEqual([]);
});

test("FAQ answers open and close with touch and keyboard", async ({ page }) => {
  await page.goto("/");
  const faq = page.getByRole("region", { name: "คำถามที่พบบ่อย" });
  const smallSchool = faq.locator("details").filter({
    has: page
      .locator("summary")
      .filter({ hasText: "โรงเรียนขนาดเล็กใช้งานได้ไหม" }),
  });
  await expect(smallSchool.locator("p")).not.toBeVisible();
  await smallSchool.locator("summary").click();
  await expect(smallSchool.locator("p")).toBeVisible();
  await smallSchool.locator("summary").click();
  await expect(smallSchool.locator("p")).not.toBeVisible();
  const training = faq.locator("details").filter({
    has: page
      .locator("summary")
      .filter({ hasText: "มีทีมงานอบรมการใช้งานให้หรือไม่" }),
  });
  await training.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(training.locator("p")).toBeVisible();
  await expect(training.locator("p")).toContainText("ต้องตกลงรูปแบบ");
  await expect(faq.getByRole("link")).toHaveAttribute("href", "/contact");
});
