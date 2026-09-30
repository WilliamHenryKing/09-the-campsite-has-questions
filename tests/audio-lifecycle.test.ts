import { afterEach, expect, test } from "bun:test";
import { Sound } from "../src/audio/sound";

class Node {
  gain = { value: 0, setTargetAtTime: (_v: number) => {} };
  playbackRate = { value: 1 };
  disconnected = 0;
  connect(destination: Node) {
    return destination;
  }
  disconnect() {
    this.disconnected++;
  }
}
class Source extends Node {
  onended: (() => void) | null = null;
  stops = 0;
  start() {}
  stop() {
    this.stops++;
  }
}
class Context {
  static all: Context[] = [];
  static decode = () => Promise.resolve({ duration: 30 });
  destination = new Node();
  currentTime = 10;
  sources: Source[] = [];
  gains: Node[] = [];
  closed = 0;
  constructor() {
    Context.all.push(this);
  }
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createBufferSource() {
    const n = new Source();
    this.sources.push(n);
    return n;
  }
  decodeAudioData() {
    return Context.decode();
  }
  async resume() {}
  async suspend() {}
  async close() {
    this.closed++;
  }
}
const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const oldFetch = globalThis.fetch;
const sounds: Sound[] = [];
const visibility = new Set<() => void>();
const timers = new Map<number, () => void>();
const signals: AbortSignal[] = [];
let timerId = 0;
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function sound() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext: Context,
      localStorage: { getItem: () => null, setItem: () => {} },
      setTimeout: (fn: () => void) => {
        const id = ++timerId;
        timers.set(id, fn);
        return id;
      },
      clearTimeout: (id: number) => timers.delete(id),
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      hidden: false,
      addEventListener: (_: string, fn: () => void) => visibility.add(fn),
      removeEventListener: (_: string, fn: () => void) => visibility.delete(fn),
    },
  });
  globalThis.fetch = ((_url: string, init: RequestInit) => {
    if (init.signal) signals.push(init.signal);
    return Promise.resolve(new Response(new Uint8Array([1])));
  }) as unknown as typeof fetch;
  const s = new Sound();
  sounds.push(s);
  return s;
}
afterEach(() => {
  for (const s of sounds.splice(0)) s.dispose();
  for (const [key, old] of [
    ["window", oldWindow],
    ["document", oldDocument],
  ] as const) {
    if (old) Object.defineProperty(globalThis, key, old);
    else Reflect.deleteProperty(globalThis, key);
  }
  globalThis.fetch = oldFetch;
  Context.all.length = 0;
  Context.decode = () => Promise.resolve({ duration: 30 });
  visibility.clear();
  timers.clear();
  signals.length = 0;
});
test("a late decode cannot revive a disposed soundtrack or contaminate a reopened graph", async () => {
  let finish: (buffer: { duration: number }) => void = () => {};
  const delayed = new Promise<{ duration: number }>((resolve) => {
    finish = resolve;
  });
  Context.decode = () => delayed;
  const s = sound();
  s.unlock();
  await tick();
  const old = Context.all[0];
  expect(visibility.size).toBe(1);
  s.dispose();
  s.dispose();
  expect(old?.closed).toBe(1);
  expect(visibility.size).toBe(0);
  expect(signals.every((signal) => signal.aborted)).toBe(true);
  Context.decode = () => Promise.resolve({ duration: 30 });
  s.unlock();
  await tick();
  await tick();
  const reopened = Context.all[1];
  expect(reopened?.sources.length).toBeGreaterThan(0);
  const voices = reopened?.sources.length;
  finish({ duration: 30 });
  await tick();
  expect(old?.sources).toHaveLength(0);
  expect(reopened?.sources.length).toBe(voices);
  expect(visibility.size).toBe(1);
});
test("ended effects disconnect; disposal settles fading beds, timers, listeners and buses once", async () => {
  const s = sound();
  s.duck(true);
  s.unlock();
  await tick();
  await tick();
  const ctx = Context.all[0];
  if (!ctx) throw new Error("Missing audio context");
  expect(ctx.gains[1]?.gain.value).toBeCloseTo(0.128);
  s.play("bell");
  const bell = ctx.sources.at(-1);
  bell?.onended?.();
  expect(bell?.disconnected).toBe(1);
  expect(bell?.onended).toBeNull();
  s.setAmbience("rain");
  expect(timers.size).toBe(1);
  s.dispose();
  s.dispose();
  expect(timers.size).toBe(0);
  expect(visibility.size).toBe(0);
  expect(ctx.closed).toBe(1);
  for (const node of [...ctx.gains, ...ctx.sources]) expect(node.disconnected).toBe(1);
  for (const src of ctx.sources.filter((src) => src !== bell)) expect(src.stops).toBe(1);
});
