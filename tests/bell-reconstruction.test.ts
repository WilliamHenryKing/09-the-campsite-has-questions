import { afterEach, describe, expect, test } from "bun:test";
import gsap from "gsap";
import * as THREE from "three";
import type { CampScene } from "../src/scene/CampScene";
import { muteCues, setCueHandler } from "../src/scene/cues";
import { C } from "../src/scene/palette";
import { disposeTree } from "../src/scene/resources";
import { bellStage } from "../src/scene/stages/bell";
import type { ReconstructionContext } from "../src/scene/stages/stage";
import { World } from "../src/scene/world";

const worlds: World[] = [];
const timelines: gsap.core.Timeline[] = [];
const postKnot = new THREE.Vector3(3.72, 1.05, 0.6);

afterEach(() => {
  for (const timeline of timelines.splice(0)) timeline.kill();
  for (const world of worlds.splice(0)) disposeTree(world.root);
  setCueHandler(() => {});
  muteCues(false);
  gsap.ticker.sleep();
});

function before() {
  const world = new World();
  worlds.push(world);
  bellStage.before(world);
  return world;
}

function beat(world: World, id: string, context: ReconstructionContext) {
  const timeline = gsap.timeline({ paused: true });
  timelines.push(timeline);
  bellStage.event(world, id, timeline, context);
  return timeline;
}

function complete(world: World, id: string, context: ReconstructionContext) {
  const timeline = beat(world, id, context);
  timeline.totalProgress(1);
  timeline.kill();
}

/** Average a tube ring's unique radial vertices to observe its attachment, not its skin. */
function ringCenter(geometry: THREE.TubeGeometry, ring: number) {
  const { radialSegments } = geometry.parameters;
  const positions = geometry.getAttribute("position");
  const center = new THREE.Vector3();
  for (let i = 0; i < radialSegments; i++) {
    center.add(new THREE.Vector3().fromBufferAttribute(positions, ring * (radialSegments + 1) + i));
  }
  return center.divideScalar(radialSegments);
}

function attached(world: World) {
  const sling = world.hammock;
  if (!sling) throw new Error("A tied hammock must exist");
  const rope = sling.children[1] as THREE.Mesh<THREE.TubeGeometry>;
  world.table.updateMatrixWorld(true);
  const tableKnot = world.table.localToWorld(new THREE.Vector3(1.05, 0.5, 0));
  const segments = rope.geometry.parameters.tubularSegments;
  expect(ringCenter(rope.geometry, 0).distanceTo(tableKnot)).toBeLessThan(1e-6);
  expect(ringCenter(rope.geometry, segments).distanceTo(postKnot)).toBeLessThan(1e-6);
  const middle = ringCenter(rope.geometry, segments / 2);
  // The horizontal coordinates are linear in the Bezier parameter; its vertical sag is quadratic.
  const t = (middle.x - tableKnot.x) / (postKnot.x - tableKnot.x);
  const expectedY = tableKnot.y + (postKnot.y - tableKnot.y) * t - 2 * 0.35 * t * (1 - t);
  expect(middle.y).toBeCloseTo(expectedY, 6);
}

describe("bell reconstruction with a moving hammock", () => {
  test("intermediate lurchs keep both buffers and the rope's moving attachment", () => {
    for (const context of [
      { mode: "test", explanation: null },
      { mode: "test", explanation: "bear" },
      { mode: "test", explanation: "hammock" },
      { mode: "payoff", explanation: null },
    ] satisfies ReconstructionContext[]) {
      const world = before();
      complete(world, "tie", context);
      complete(world, "dew", context);
      const sling = world.hammock;
      if (!sling) throw new Error("Tying must create the hammock");
      const meshes = sling.children as THREE.Mesh<THREE.TubeGeometry>[];
      const buffers = meshes.map((mesh) => ({
        mesh,
        geometry: mesh.geometry,
        position: mesh.geometry.getAttribute("position"),
        normal: mesh.geometry.getAttribute("normal"),
      }));
      const initial = buffers.map(({ position }) => Array.from(position.array));
      let rings = 0;
      setCueHandler((name) => {
        if (name === "bell") rings++;
      });
      const lurch = beat(world, "lurch", context);
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        lurch.totalProgress(progress);
        expect(world.hammock).toBe(sling);
        expect(sling.parent).toBe(world.root);
        for (const { mesh, geometry, position, normal } of buffers) {
          expect(mesh.geometry).toBe(geometry);
          expect(geometry.getAttribute("position")).toBe(position);
          expect(geometry.getAttribute("normal")).toBe(normal);
        }
        attached(world);
      }
      expect(world.table.position.distanceTo(new THREE.Vector3(0.3, 0, 0.5))).toBeLessThan(1e-9);
      expect(world.table.rotation.y).toBeCloseTo(0.1);
      expect(rings).toBe(1);
      for (const [index, buffer] of buffers.entries())
        expect(Array.from(buffer.position.array)).not.toEqual(initial[index] ?? []);
    }
  });

  test("all event orders create the hammock only at tie and retain the chosen cause", () => {
    const orders = [
      ["tie", "dew", "lurch"],
      ["tie", "lurch", "dew"],
      ["dew", "tie", "lurch"],
      ["dew", "lurch", "tie"],
      ["lurch", "tie", "dew"],
      ["lurch", "dew", "tie"],
    ];
    for (const explanation of [null, "bear", "hammock"]) {
      const world = before();
      const context: ReconstructionContext = { mode: "test", explanation };
      for (const order of orders) {
        world.reset();
        bellStage.before(world);
        const marge = world.cast.marge.root.position.toArray();
        let tied = false;
        let dew = false;
        let rings = 0;
        setCueHandler((name) => {
          if (name === "bell") rings++;
        });
        for (const id of order) {
          complete(world, id, context);
          tied ||= id === "tie";
          dew ||= id === "dew";
          expect(Boolean(world.hammock)).toBe(tied);
          expect(world.ground.color.getHex()).toBe(dew ? C.grassDew : C.grass);
          if (tied) attached(world);
        }
        expect(rings).toBe(1);
        expect(Boolean(world.extras.getObjectByName("reconstruction-bear"))).toBe(
          explanation === "bear",
        );
        if (explanation !== "hammock") {
          expect(world.cast.marge.root.position.toArray()).toEqual(marge);
          expect(world.cast.marge.root.rotation.z).toBe(0);
        }
      }
    }
  });

  test("canceling a lurch settles once, restores the found sling, and cannot affect a new theory", async () => {
    const world = before();
    const context: ReconstructionContext = { mode: "test", explanation: "hammock" };
    complete(world, "tie", context);
    complete(world, "dew", context);
    const oldSling = world.hammock;
    if (!oldSling) throw new Error("Tying must create the hammock");
    let disposed = 0;
    for (const mesh of oldSling.children as THREE.Mesh[]) {
      mesh.geometry.addEventListener("dispose", () => disposed++);
    }
    // Opening reads URL metadata on import; no DOM, window or renderer is needed by playback.
    const location = Object.getOwnPropertyDescriptor(globalThis, "location");
    if (!location)
      Object.defineProperty(globalThis, "location", { configurable: true, value: { search: "" } });
    let Playback: typeof CampScene;
    try {
      Playback = (await import("../src/scene/CampScene")).CampScene;
    } finally {
      if (!location) Reflect.deleteProperty(globalThis, "location");
    }
    const scene = Object.assign(Object.create(Playback.prototype), {
      world,
      stage: bellStage,
      reconstruction: context,
      running: null as gsap.core.Timeline | null,
      settlePlayback: null,
      holdTimer: null,
      disposed: false,
      reducedMotion: false,
    }) as CampScene;
    const owner = scene as unknown as { running: gsap.core.Timeline | null };
    let rings = 0;
    setCueHandler((name) => {
      if (name === "bell") rings++;
    });
    let settled = 0;
    const playback = scene.playEvent("lurch").then(() => settled++);
    const moving = owner.running;
    if (!moving) throw new Error("Playback must own its lurch timeline");
    moving.pause().totalProgress(0.45);
    scene.cancelPlayback();
    scene.cancelPlayback();
    await playback;
    expect(settled).toBe(1);
    expect(owner.running).toBeNull();
    expect(moving.parent).toBeNull();
    expect(rings).toBe(0);
    scene.showFound();
    expect(disposed).toBe(2);
    expect(oldSling.parent).toBeNull();
    expect(world.hammock).not.toBe(oldSling);
    expect(world.table.position.toArray()).toEqual([0.3, 0, 0.5]);
    attached(world);

    scene.beginReconstruction({ mode: "test", explanation: "bear" });
    expect(world.hammock).toBeNull();
    const nextPlayback = scene.playEvent("lurch");
    const next = owner.running;
    if (!next) throw new Error("The new theory must own its timeline");
    next.pause().totalProgress(1);
    await nextPlayback;
    expect(rings).toBe(1);
    expect(world.hammock).toBeNull();
    expect(world.cast.marge.root.rotation.z).toBe(0);
    expect(
      world.extras.children.filter((child) => child.name === "reconstruction-bear"),
    ).toHaveLength(1);
    scene.showFound();
    expect(world.extras.getObjectByName("reconstruction-bear")).toBeUndefined();
    expect(world.hammock).not.toBeNull();
    attached(world);
    expect(disposed).toBe(2);
  });
});
