import { describe, expect, test } from "bun:test";
import { createActionGate } from "../src/ui/actionGate";

describe("reconstruction action ownership", () => {
  test("two activations before React commits start only one reconstruction", () => {
    const gate = createActionGate();
    const first = gate.begin();
    expect(first).not.toBeNull();
    expect(gate.begin()).toBeNull();
    expect(gate.pending).toBe(true);
    gate.finish(first as number);
    expect(gate.begin()).not.toBeNull();
  });

  test("Back invalidates a running test before another test starts", () => {
    const gate = createActionGate();
    const old = gate.begin() as number;
    gate.cancel();
    const current = gate.begin() as number;
    expect(gate.current(old)).toBe(false);
    expect(gate.current(current)).toBe(true);
    // The old scene promise settling must not unlock the new test's File action.
    gate.finish(old);
    expect(gate.pending).toBe(true);
    expect(gate.begin()).toBeNull();
    gate.finish(current);
    expect(gate.pending).toBe(false);
  });

  test("changing case invalidates a snapshot completion without another action", () => {
    const gate = createActionGate();
    const snapshot = gate.begin() as number;
    gate.cancel();
    expect(gate.current(snapshot)).toBe(false);
    expect(gate.pending).toBe(false);
  });

  test("runtime failure invalidates all completions and future actions", () => {
    const gate = createActionGate();
    const filing = gate.begin() as number;
    gate.dispose();
    gate.finish(filing);
    gate.cancel();
    expect(gate.current(filing)).toBe(false);
    expect(gate.begin()).toBeNull();
    expect(gate.pending).toBe(false);
  });
});
