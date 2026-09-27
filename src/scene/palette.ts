import * as THREE from "three";

// One muted, sun-faded palette shared by every prop so the diorama reads as a single illustration.
export const C = {
  grass: 0x9dbb6e,
  grassWet: 0x6f8f5a,
  grassDew: 0xc9d6c6,
  earth: 0x8a6a4a,
  path: 0xd8c39a,
  wood: 0xb7865a,
  woodDark: 0x7a5638,
  bark: 0x6e513c,
  leaf: 0x7da25e,
  leafDark: 0x5c8452,
  pine: 0x4f7a5a,
  tent: 0x6fa27a,
  canvas: 0xefe6d2,
  check: 0xd9665b,
  water: 0x6aa6c4,
  lemonade: 0xf2d15c,
  brass: 0xd8a93e,
  stone: 0xa7a39a,
  ink: 0x2b2a33,
  metal: 0x6c7480,
  flame: 0xff9a3c,
  rope: 0xd9c49a,
  groove: 0x4d3a2a,
  sock: 0xe87a4f,
} as const;

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** Shared matte material; flat shading gives the carved, illustrated look. */
export function mat(color: number, opts: { flat?: boolean; rough?: number } = {}) {
  const key = `${color}:${opts.flat ?? false}:${opts.rough ?? 0.85}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: 0,
      flatShading: opts.flat ?? false,
    });
    cache.set(key, m);
  }
  return m;
}

/** A mesh that casts and receives shadows, positioned in one call. */
export function mesh(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}
