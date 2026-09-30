import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export async function ready(page: Page) {
  await page.waitForFunction(() => !document.getElementById("arrival"), null, { timeout: 90_000 });
  if (process.env.REQUIRE_REAL_GPU === "1") {
    const gpu = await page.evaluate(() => {
      const gl = document.querySelector("canvas")?.getContext("webgl2");
      const ext = gl?.getExtension("WEBGL_debug_renderer_info");
      return ext ? gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
    });
    expect(gpu).toMatch(/NVIDIA|RTX/i);
    expect(gpu).not.toMatch(/SwiftShader|llvmpipe/i);
  }
}
export async function shot(page: Page, name: string) {
  const out = path.resolve("../../.workspace/bug-pass-2026-09-30/09");
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: path.join(out, `${name}.png`) });
}
