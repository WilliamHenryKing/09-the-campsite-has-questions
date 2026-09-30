import { expect, test } from "@playwright/test";
import { ready } from "./support";

test.describe("touch onboarding on small screens", () => {
  test.use({ hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 568, height: 320 },
  ]) {
    test(`${viewport.width}x${viewport.height}: title, evidence and guide remain usable`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/?e2e&intro");
      await ready(page);
      const begin = page.getByRole("button", { name: "Open the casebook", exact: true });
      await begin.scrollIntoViewIfNeeded();
      await begin.tap();
      const guide = page.getByLabel("Investigation guide", { exact: true });
      await expect(guide).toBeVisible();
      const evidence = page.getByRole("button", {
        name: "Inspect Marge's fallen book",
        exact: true,
      });
      await evidence.tap();
      const bounds = await guide.boundingBox();
      const panel = await page.locator(".inspect").boundingBox();
      expect(bounds).not.toBeNull();
      expect(panel).not.toBeNull();
      expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(panel?.y ?? 0);
      await page.getByRole("button", { name: "Turn right", exact: true }).tap();
      await expect(guide).toContainText("3/4");
      await page.getByRole("button", { name: "Back to camp", exact: true }).tap();
      await page.getByRole("button", { name: "Skip the guide", exact: true }).tap();
      await page.getByRole("button", { name: "Talk to Warden Gus", exact: true }).tap();
      await expect(page.getByRole("heading", { name: /Warden Gus/ })).toBeVisible();
      await page.getByRole("button", { name: "Thank you", exact: true }).tap();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    });
  }
});
