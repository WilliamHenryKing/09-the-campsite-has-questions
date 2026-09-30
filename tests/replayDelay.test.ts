import { describe, expect, test } from "bun:test";
import { replayDelay } from "../src/ui/replayDelay";

describe("reconstruction reading pauses", () => {
  test("cancelling a replay settles its reading pause immediately", async () => {
    const controller = new AbortController();
    const pause = replayDelay(60_000, controller.signal);
    controller.abort();
    expect(await pause).toBe(false);
  }, 500);

  test("an already cancelled replay cannot schedule another pause", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(await replayDelay(60_000, controller.signal)).toBe(false);
  }, 500);

  test("an uninterrupted reading pause completes normally", async () => {
    const controller = new AbortController();
    expect(await replayDelay(1, controller.signal)).toBe(true);
    controller.abort();
  });
});
