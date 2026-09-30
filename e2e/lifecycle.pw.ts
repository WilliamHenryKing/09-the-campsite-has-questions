import { expect, test } from "@playwright/test";
import { ready, shot } from "./support";

test("a first-frame failure stays covered and offers recovery", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      WebGL2RenderingContext.prototype.drawElements = draw;
      const ext = this.getExtension("WEBGL_debug_renderer_info");
      Object.assign(window, {
        failureGpu: ext ? this.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "",
      });
      if (args.length) throw new Error("Injected first-frame failure");
    };
  });
  await page.goto("/?e2e&intro");
  const reload = page.getByRole("button", { name: "Reload", exact: true });
  await expect(reload).toBeFocused();
  await reload.click({ trial: true });
  await expect(page.locator("#arrival")).not.toHaveClass(/is-done/);
  await expect(page.locator("#root > *")).toHaveCount(0);
  if (process.env.REQUIRE_REAL_GPU === "1") {
    expect(
      await page.evaluate(() => (window as unknown as { failureGpu: string }).failureGpu),
    ).toMatch(/NVIDIA|RTX/i);
  }
  await shot(page, "first-frame-recovery");
  expect(errors).toEqual([]);
});

test("live calm cuts the camp tour without needing a reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?e2e&intro");
  await ready(page);
  await page.getByRole("button", { name: "Open the casebook", exact: true }).click();
  await page.waitForTimeout(300);
  await expect(page.getByLabel("Investigation guide", { exact: true })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByLabel("Investigation guide", { exact: true })).toBeVisible({
    timeout: 1000,
  });
  await expect(page.getByRole("button", { name: "Incident Board", exact: true })).toBeVisible();
  await shot(page, "live-calm-guide");
  expect(errors).toEqual([]);
});

test("held shortcuts and editing targets keep their native behavior", async ({ page }) => {
  await page.goto("/?e2e");
  await ready(page);
  await page.getByRole("button", { name: "Skip the guide", exact: true }).click();
  await page.locator(".view").focus();
  await page.keyboard.down("b");
  await page.keyboard.down("b");
  await page.keyboard.up("b");
  await expect(page.getByRole("heading", { name: "Incident Board", exact: true })).toBeVisible();
  await page.getByRole("radio").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Incident Board", exact: true })).toHaveCount(0);
  await page.locator(".view").focus();
  await page.keyboard.down("m");
  await page.keyboard.down("m");
  await page.keyboard.up("m");
  await expect(
    page.getByRole("button", { name: "Sound off. Turn sound on", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const input = document.createElement("textarea");
    input.id = "native-edit";
    input.style.cssText = "position:fixed;top:120px;left:20px;z-index:200";
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.type("bm bm");
  await expect(page.locator("#native-edit")).toHaveValue("bm bm");
  await expect(page.getByRole("heading", { name: "Incident Board", exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sound off. Turn sound on", exact: true }),
  ).toBeVisible();
});

test("render failure removes active UI and soundtrack before offering focused recovery", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        contexts.push(this);
      }
    };
    Object.assign(window, { audioStates: () => contexts.map((context) => context.state) });
  });
  await page.goto("/?e2e");
  await ready(page);
  await page.getByRole("button", { name: "Skip the guide", exact: true }).click();
  await page.getByRole("button", { name: "Incident Board", exact: true }).click();
  await page.getByRole("button", { name: "Test against the scene", exact: true }).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const gl = document.querySelector("canvas")?.getContext("webgl2");
    if (!gl) throw new Error("Missing game WebGL context");
    const draw = gl.drawElements;
    gl.drawElements = () => {
      gl.drawElements = draw;
      throw new Error("Injected render failure during reconstruction");
    };
  });
  const reload = page.getByRole("button", { name: "Reload", exact: true });
  await expect(reload).toBeFocused();
  await reload.click({ trial: true });
  await expect(page.locator("#root > *")).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { audioStates(): string[] }).audioStates()),
    )
    .toEqual(["closed"]);
  await page.waitForTimeout(1500);
  await expect(page.locator("#root > *")).toHaveCount(0);
  await shot(page, "runtime-recovery");
  expect(errors).toEqual([]);
});
