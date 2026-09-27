import type { Recipes } from "./kit/build";
import {
  bend,
  blend,
  box,
  capsule,
  carve,
  chain,
  cone,
  cylinder,
  displace,
  ellipsoid,
  extrude,
  fbm,
  lathe,
  type Mat,
  mat,
  mirrorX,
  mottle,
  move,
  type Node,
  paint,
  polygon2,
  radial,
  rng,
  rotate,
  scale,
  sphere,
  subtract,
  torus,
  union,
  type Vec3,
} from "./kit/sdf";

const pick = <T>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)] as T;
const range = (r: () => number, a: number, b: number) => a + (b - a) * r();
void [bend, blend, box, capsule, carve, chain, cone, cylinder, displace, ellipsoid, extrude, fbm, lathe, mirrorX, mottle, move, paint, polygon2, radial, rotate, scale, sphere, subtract, torus, union];
type Build = (seed: number, index: number) => Node;
void (0 as unknown as Mat | Vec3 | Build);

// THE CAMPSITE HAS QUESTIONS — an illustrated miniature campground: tents, chairs, coolers,
// lanterns, fire rings, signs and the evidence props the mysteries turn on.
const CANVAS = [0xd9a441, 0x3f7a4f, 0xc84b3c, 0x3f5f7a, 0xe8e0cc, 0x8a4f7a];
const tent: Build = (seed) => {
  const r = rng(seed);
  const cloth = mat(pick(r, CANVAS), 0.85);
  const w = range(r, 1.4, 2.2);
  const len = range(r, 1.8, 2.6);
  const ridge = { d: (x: number, y: number, z: number) => Math.max(Math.abs(z) - len / 2, (Math.abs(x) * 0.9 + y - w * 0.55) / 1.345, -y), mat: () => cloth, box: [-w * 0.65, 0, -len / 2, w * 0.65, w * 0.55, len / 2] as [number, number, number, number, number, number] };
  const door = move(box(w * 0.35, w * 0.4, 0.3), [0, w * 0.15, len / 2]);
  const poles = union(...[-1, 1].map((s) => capsule([0, 0, (s * len) / 2], [0, w * 0.6, (s * len) / 2], 0.012, 0.012, mat(0x9aa0a6, 0.3, 1))));
  const guys = mirrorX(capsule([w * 0.1, w * 0.5, len / 2], [w * 0.8, 0, len / 2 + 0.3], 0.004, 0.004, mat(0xe8e0cc, 0.8)));
  return union(subtract(ridge, door), poles, guys);
};
const chair: Build = (seed) => {
  const r = rng(seed);
  const frame = mat(0x2a2a2a, 0.4, 0.8);
  const fabric = mat(pick(r, CANVAS), 0.85);
  const legs = union(capsule([-0.25, 0, -0.2], [0.25, 0.45, 0.2], 0.012, 0.012, frame), capsule([0.25, 0, -0.2], [-0.25, 0.45, 0.2], 0.012, 0.012, frame), capsule([-0.25, 0, 0.2], [0.25, 0.45, -0.2], 0.012, 0.012, frame), capsule([0.25, 0, 0.2], [-0.25, 0.45, -0.2], 0.012, 0.012, frame));
  const seat = move(box(0.5, 0.02, 0.42, 0.008, fabric), [0, 0.45, 0]);
  const back = move(rotate(box(0.5, 0.4, 0.02, 0.008, fabric), [-0.2, 0, 0]), [0, 0.68, -0.22]);
  return union(legs, seat, back);
};
const cooler: Build = (seed) => {
  const r = rng(seed);
  const shell = mat(pick(r, [0x2f6f8a, 0xc84b3c, 0xe8e0cc, 0x3f7a4f]), 0.4);
  const lid = mat(0xe8e0cc, 0.4);
  return union(box(0.6, 0.35, 0.36, 0.04, shell), move(box(0.62, 0.07, 0.38, 0.03, lid), [0, 0.2, 0]), move(rotate(torus(0.12, 0.012, mat(0x2a2a2a, 0.5)), [Math.PI / 2, 0, 0]), [0, 0.24, 0]));
};
const lantern: Build = (seed) => {
  const r = rng(seed);
  const metal = mat(pick(r, [0x2f4a3a, 0x8a3a2a, 0x2a2a2a]), 0.4, 0.8);
  return union(move(cylinder(0.08, 0.03, 0.006, metal), [0, 0.015, 0]), move(cylinder(0.06, 0.16, 0.004, mat(0xffe2a8, 0.1)), [0, 0.11, 0]), move(cone(0.09, 0.02, 0.06, metal), [0, 0.22, 0]), move(rotate(torus(0.06, 0.006, metal), [Math.PI / 2, 0, 0]), [0, 0.3, 0]));
};
const fireRing: Build = (seed) => {
  const r = rng(seed);
  const stones: Node[] = [];
  const n = 9 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    stones.push(displace(move(ellipsoid(0.1, 0.07, 0.08, mat(pick(r, [0x6a6a66, 0x7a7870, 0x5a5a58]), 0.8)), [Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45]), 0.012, 20, 3, seed + i));
  }
  const logs = union(...[0, 1, 2].map((i) => move(rotate(cylinder(0.04, 0.5, 0.01, mat(0x4a3a2a, 0.9)), [0, i * 1.05, Math.PI / 2 - 0.35]), [0, 0.12, 0])));
  const ash = move(cylinder(0.3, 0.02, 0.01, mat(0x3a3836, 0.95)), [0, 0.01, 0]);
  return union(...stones, logs, ash);
};
const evidence: Build = (seed, index) => {
  const r = rng(seed);
  switch (index % 6) {
    case 0: // bootprint cast, lying flat, with the tread pressed into its top
      return rotate(carve(0.002, displace(extrude((x, y) => Math.hypot(x / 0.06, (y - 0.03) / 0.14) - 1, [-0.07, -0.12, 0.07, 0.18], 0.03, 0.01, mat(0xd9d0c0, 0.9)), 0.003, 40, 3, seed), union(...[-0.06, -0.02, 0.02, 0.06, 0.1].map((y) => move(box(0.1, 0.012, 0.02), [0, y, 0.015])))), [-Math.PI / 2, 0, 0]);
    case 1: // marshmallow stick
      return union(capsule([0, 0, 0], [0.5, 0.05, 0], 0.006, 0.004, mat(0x8a6a45, 0.8)), move(cylinder(0.018, 0.03, 0.008, mat(0xf2e6d6, 0.9)), [0.52, 0.052, 0]));
    case 2: // torn map
      return bend(displace(box(0.3, 0.004, 0.22, 0.001, mat(0xe8dcb8, 0.9)), 0.004, 20, 3, seed), 1.5);
    case 3: // binoculars
      return union(...[-0.035, 0.035].map((x) => move(rotate(cylinder(0.025, 0.12, 0.006, mat(0x2a2a2a, 0.5)), [Math.PI / 2, 0, 0]), [x, 0, 0])), move(box(0.04, 0.02, 0.04, 0.005, mat(0x2a2a2a, 0.5)), [0, 0, 0]));
    case 4: // flashlight
      return union(move(rotate(cylinder(0.018, 0.16, 0.004, mat(pick(r, [0xc84b3c, 0xd9a441]), 0.4)), [Math.PI / 2, 0, 0]), [0, 0, 0]), move(rotate(cone(0.018, 0.03, 0.04, mat(0x9aa0a6, 0.3, 1)), [Math.PI / 2, 0, 0]), [0, 0, 0.1]));
    default: // enamel mug with a chip
      return carve(0.004, union(lathe([[0.045, 0.1], [0.045, 0], [0, 0]], 0.004, mat(pick(r, [0x2f6f8a, 0xe8e0cc]), 0.35)), move(rotate(torus(0.03, 0.006, mat(0x2f6f8a, 0.35)), [Math.PI / 2, 0, 0]), [0.055, 0.05, 0])), move(sphere(0.008), [0.045, 0.1, 0.01]));
  }
};
const sign: Build = (seed) => {
  const r = rng(seed);
  const wood = mat(pick(r, [0x7a5a3c, 0x8a6a45]), 0.85);
  return union(move(box(0.08, 1.2, 0.08, 0.01, wood), [0, 0.6, 0]), move(box(0.6, 0.35, 0.04, 0.01, mat(pick(r, [0x3f5f3a, 0x7a3a2a, 0xe8e0cc]), 0.6)), [0, 1.1, 0.05]));
};

export const project = { id: "09-the-campsite-has-questions", name: "THE CAMPSITE HAS QUESTIONS", background: 0x2d2a33 };
export const families: Recipes["families"] = [
  { id: "tent", count: 12, voxel: 0.015, keep: 0.25, hero: true, build: tent },
  { id: "camp-chair", count: 12, voxel: 0.005, keep: 0.3, build: chair },
  { id: "cooler", count: 8, voxel: 0.006, keep: 0.3, build: cooler },
  { id: "camp-lantern", count: 8, voxel: 0.003, keep: 0.3, build: lantern },
  { id: "fire-ring", count: 8, voxel: 0.008, keep: 0.25, build: fireRing },
  { id: "evidence", count: 72, voxel: 0.002, keep: 0.3, build: evidence },
  { id: "camp-sign", count: 20, voxel: 0.008, keep: 0.3, build: sign },
];
export const textures: Recipes["textures"] = [
  { id: "tent-nylon", ramp: [0xa87a2a, 0xd9a441, 0xe6b85a], layers: [{ kind: "weave", count: 128, weight: 0.4 }, { kind: "fbm", scale: 6, weight: 0.6 }], roughness: [0.5, 0.7], normal: 0.8 },
  { id: "campground-dirt", ramp: [0x4a3a2a, 0x6a5440, 0x8a7258], layers: [{ kind: "fbm", scale: 20, octaves: 6 }, { kind: "cells", count: 64, weight: 0.3 }], roughness: [0.85, 1], normal: 2 },
  { id: "pine-needles", ramp: [0x5a3a1a, 0x8a5a2a, 0xa8743a], layers: [{ kind: "fibres", scale: 48, stretch: 10 }, { kind: "fibres", scale: 48, stretch: 10, angle: 1, weight: 0.8 }], roughness: [0.8, 0.95], normal: 2.2 },
  { id: "incident-paper", ramp: [0xd9ccaa, 0xe8dcb8, 0xf2ead0], layers: [{ kind: "fibres", scale: 64, stretch: 5 }, { kind: "fbm", scale: 4, weight: 0.5 }], roughness: [0.85, 0.95], normal: 0.6 },
];
