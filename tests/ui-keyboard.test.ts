import { describe, expect, test } from "bun:test";
import {
  createKeyOwnership,
  keyboardCommand,
  suppressRepeatedActivation,
} from "../src/ui/keyboard";

// These targets expose just DOM selector results; no browser or renderer is needed.
function target(kind: "text" | "radio" | "button" | "scroll") {
  const element = new EventTarget();
  Object.assign(element, {
    closest: (selector: string) => {
      if (selector.startsWith("input[type=")) return kind === "radio" ? element : null;
      return kind === "text" || kind === "radio" ? element : null;
    },
    matches: () => kind === "scroll",
  });
  return element;
}

describe("camp keyboard commands", () => {
  test("holding B opens the board once", () => {
    expect(keyboardCommand({ key: "b", code: "KeyB" }, null)).toEqual({ kind: "board" });
    expect(keyboardCommand({ key: "B", code: "KeyB", repeat: true }, null)).toBeNull();
  });

  test("browser shortcuts, prevented keys and text editing retain ownership", () => {
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "defaultPrevented"] as const) {
      expect(keyboardCommand({ key: "b", [modifier]: true }, null)).toBeNull();
      expect(keyboardCommand({ key: "ArrowLeft", [modifier]: true }, null)).toBeNull();
    }
    for (const key of ["b", "ArrowLeft", "Escape"]) {
      expect(keyboardCommand({ key }, target("text"))).toBeNull();
    }
  });

  test("board radio arrows are native and Escape still closes the board", () => {
    expect(keyboardCommand({ key: "ArrowRight" }, target("radio"))).toBeNull();
    expect(keyboardCommand({ key: "b" }, target("radio"))).toBeNull();
    expect(keyboardCommand({ key: "Escape" }, target("radio"))).toEqual({ kind: "close" });
  });

  test("native scroll surfaces retain arrows while ordinary buttons allow turning", () => {
    expect(keyboardCommand({ key: "ArrowDown" }, target("scroll"))).toBeNull();
    expect(keyboardCommand({ key: "ArrowLeft" }, target("button"))).toEqual({
      kind: "turn",
      x: -0.15,
      y: 0,
    });
  });

  test("held Enter and Space cannot repeat button activation but keep native scrolling", () => {
    for (const key of ["Enter", " "]) {
      expect(suppressRepeatedActivation({ key }, target("button"))).toBe(false);
      expect(suppressRepeatedActivation({ key, repeat: true }, target("button"))).toBe(true);
      expect(suppressRepeatedActivation({ key, repeat: true }, target("text"))).toBe(false);
      expect(suppressRepeatedActivation({ key, repeat: true }, target("scroll"))).toBe(false);
      expect(suppressRepeatedActivation({ key, repeat: true, altKey: true }, null)).toBe(false);
    }
  });

  test("blur or panel transitions reject old repeats until a fresh physical press", () => {
    const keys = createKeyOwnership();
    const down = { key: "ArrowLeft", code: "ArrowLeft" };
    expect(keys.accept({ ...down, repeat: true })).toBe(false);
    expect(keys.accept(down)).toBe(true);
    expect(keys.accept({ ...down, repeat: true })).toBe(true);
    keys.clear();
    expect(keys.accept({ ...down, repeat: true })).toBe(false);
    expect(keys.accept(down)).toBe(true);
    keys.release(down);
    expect(keys.accept({ ...down, repeat: true })).toBe(false);
  });
});
