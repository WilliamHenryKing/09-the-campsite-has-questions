import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { attachDrag } from "../src/ui/dragInput";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

function pointer(
  type: string,
  id = 1,
  x = 0,
  y = 0,
  options: { button?: number; isPrimary?: boolean } = {},
) {
  return Object.assign(new Event(type, { cancelable: true }), {
    pointerId: id,
    clientX: x,
    clientY: y,
    button: options.button ?? 0,
    isPrimary: options.isPrimary ?? true,
  });
}

class Canvas extends EventTarget {
  captured = new Set<number>();
  released: number[] = [];
  focused = false;
  rejectCapture = false;
  setPointerCapture(id: number) {
    if (this.rejectCapture) throw new Error("detached canvas");
    this.captured.add(id);
  }
  hasPointerCapture(id: number) {
    return this.captured.has(id);
  }
  releasePointerCapture(id: number) {
    this.captured.delete(id);
    this.released.push(id);
    this.dispatchEvent(pointer("lostpointercapture", id));
  }
  focus() {
    this.focused = true;
  }
}

let win: EventTarget;
let doc: EventTarget & { hidden: boolean };
let bindings: ReturnType<typeof attachDrag>[];
beforeEach(() => {
  win = new EventTarget();
  doc = Object.assign(new EventTarget(), { hidden: false });
  Object.defineProperty(globalThis, "window", { value: win, configurable: true });
  Object.defineProperty(globalThis, "document", { value: doc, configurable: true });
  bindings = [];
});
afterEach(() => {
  for (const binding of bindings) binding.detach();
  for (const [name, descriptor] of [
    ["window", originalWindow],
    ["document", originalDocument],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

function fixture() {
  const canvas = new Canvas();
  const turns: [number, number][] = [];
  let active = true;
  const input = attachDrag(canvas as unknown as HTMLCanvasElement, {
    active: () => active,
    turn: (x, y) => turns.push([x, y]),
  });
  bindings.push(input);
  return {
    canvas,
    turns,
    input,
    deactivate: () => {
      active = false;
    },
  };
}

describe("owned camp and evidence dragging", () => {
  test("another contact cannot replace, move or release the owner", () => {
    const { canvas, turns } = fixture();
    canvas.dispatchEvent(pointer("pointerdown", 1, 10, 10));
    canvas.dispatchEvent(pointer("pointerdown", 2, 90, 90));
    canvas.dispatchEvent(pointer("pointermove", 2, 100, 100));
    canvas.dispatchEvent(pointer("pointerup", 2));
    canvas.dispatchEvent(pointer("pointercancel", 2));
    expect(canvas.captured.has(1)).toBe(true);
    expect(canvas.captured.has(2)).toBe(false);
    expect(turns).toEqual([]);
    canvas.dispatchEvent(pointer("pointermove", 1, 20, 5));
    expect(turns).toEqual([[0.06, -0.03]]);
    canvas.dispatchEvent(pointer("pointerup", 1));
    expect(canvas.released).toEqual([1]);
  });

  test("right mouse buttons and secondary contacts cannot begin a drag", () => {
    const { canvas, turns } = fixture();
    canvas.dispatchEvent(pointer("pointerdown", 1, 0, 0, { button: 2 }));
    canvas.dispatchEvent(pointer("pointerdown", 2, 0, 0, { isPrimary: false }));
    canvas.dispatchEvent(pointer("pointermove", 1, 10, 0));
    expect(canvas.focused).toBe(false);
    expect(canvas.captured.size).toBe(0);
    expect(turns).toEqual([]);
  });

  test("opening a panel blocks an already captured pointer before its next movement", () => {
    const { canvas, turns, deactivate } = fixture();
    canvas.dispatchEvent(pointer("pointerdown"));
    deactivate();
    canvas.dispatchEvent(pointer("pointermove", 1, 40, 0));
    expect(canvas.captured.size).toBe(0);
    expect(canvas.released).toEqual([1]);
    expect(turns).toEqual([]);
  });

  test("cancel, lost capture, blur, hidden pages and resizing each end the drag", () => {
    for (const cancel of [
      (canvas: Canvas) => canvas.dispatchEvent(pointer("pointercancel")),
      (canvas: Canvas) => canvas.dispatchEvent(pointer("lostpointercapture")),
      () => win.dispatchEvent(new Event("blur")),
      () => win.dispatchEvent(new Event("resize")),
      () => {
        doc.hidden = true;
        doc.dispatchEvent(new Event("visibilitychange"));
      },
    ]) {
      const { canvas, turns } = fixture();
      canvas.dispatchEvent(pointer("pointerdown"));
      cancel(canvas);
      canvas.dispatchEvent(pointer("pointermove", 1, 30, 0));
      expect(canvas.captured.size).toBe(0);
      expect(turns).toEqual([]);
      doc.hidden = false;
    }
  });

  test("detaching releases capture and removes all input ownership", () => {
    const { canvas, turns, input } = fixture();
    canvas.dispatchEvent(pointer("pointerdown"));
    input.detach();
    input.detach();
    canvas.dispatchEvent(pointer("pointermove", 1, 20, 0));
    canvas.dispatchEvent(pointer("pointerdown", 2));
    expect(canvas.released).toEqual([1]);
    expect(canvas.captured.size).toBe(0);
    expect(turns).toEqual([]);
  });

  test("a refused capture cannot leave a ghost drag", () => {
    const { canvas, turns } = fixture();
    canvas.rejectCapture = true;
    canvas.dispatchEvent(pointer("pointerdown"));
    canvas.rejectCapture = false;
    canvas.dispatchEvent(pointer("pointermove", 1, 20, 0));
    expect(turns).toEqual([]);
    canvas.dispatchEvent(pointer("pointerdown", 2));
    canvas.dispatchEvent(pointer("pointermove", 2, 10, 0));
    expect(turns).toEqual([[0.06, 0]]);
  });
});
