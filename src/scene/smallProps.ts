import * as THREE from "three";
import { C, group, mat, mesh } from "./palette";

// Small movable evidence: baskets, books, pegs, and the marks things leave on the ground.

export function basket(): THREE.Group {
  const body = mesh(new THREE.BoxGeometry(0.5, 0.28, 0.34), mat(C.wood, { flat: true }), 0, 0.14, 0);
  const lid = mesh(new THREE.BoxGeometry(0.52, 0.04, 0.36), mat(C.check), 0, 0.3, 0);
  const handle = mesh(new THREE.TorusGeometry(0.16, 0.02, 5, 12, Math.PI), mat(C.woodDark), 0, 0.3, 0);
  return group(body, lid, handle);
}

export function jug(): THREE.Group {
  const glass = new THREE.MeshStandardMaterial({
    color: C.lemonade,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const body = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 12), glass, 0, 0.15, 0);
  const lid = mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 12), mat(C.canvas), 0, 0.31, 0);
  return group(body, lid);
}

export function book(): THREE.Group {
  const cover = mat(0x5b7fa6);
  const left = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.28), cover, -0.1, 0.02, 0);
  left.rotation.z = 0.15;
  const right = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.28), cover, 0.1, 0.02, 0);
  right.rotation.z = -0.15;
  const pages = mesh(new THREE.BoxGeometry(0.36, 0.03, 0.25), mat(C.canvas), 0, 0.04, 0);
  return group(left, right, pages);
}

export function blanket(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const m = mesh(geo, mat(C.check, { flat: true }));
  m.scale.set(1, 0.7, 0.8);
  return m;
}

export function pegs(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = mesh(new THREE.CylinderGeometry(0.025, 0.012, 0.3, 5), mat(C.metal, { rough: 0.4 }));
    p.name = `peg${i}`;
    g.add(p);
  }
  return g;
}

/** Evenly spaced marks along a path, revealed one by one as something passes. */
export function trail(points: THREE.Vector3[], spacing: number, make: () => THREE.Object3D) {
  const curve = new THREE.CatmullRomCurve3(points);
  const count = Math.max(2, Math.round(curve.getLength() / spacing));
  const g = new THREE.Group();
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const item = make();
    item.position.copy(curve.getPointAt(t));
    const tangent = curve.getTangentAt(t);
    item.rotation.y = Math.atan2(tangent.x, tangent.z);
    g.add(item);
  }
  return { group: g, curve };
}

/** Show the first fraction of a trail's marks. */
export function revealTrail(g: THREE.Group, fraction: number) {
  const n = g.children.length;
  g.children.forEach((c, i) => {
    c.visible = i < Math.round(fraction * n);
  });
}

export function drip(): THREE.Mesh {
  const d = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 8),
    new THREE.MeshStandardMaterial({ color: C.lemonade, roughness: 0.15 }),
  );
  d.rotation.x = -Math.PI / 2;
  d.position.y = 0.025;
  d.receiveShadow = true;
  return d;
}

/** A pair of drag grooves, one short segment per mark. */
export function groovePair(gap = 0.4, color: number = C.groove): () => THREE.Object3D {
  const geo = new THREE.BoxGeometry(0.05, 0.012, 0.2);
  return () => {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(geo, mat(color));
      m.position.set((s * gap) / 2, 0.012, 0);
      m.receiveShadow = true;
      g.add(m);
    }
    return g;
  };
}

export function flatPatch(w: number, d: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

export function puddle(color: number = 0xb08a5a): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.1 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.015;
  m.scale.set(1, 0.6, 1);
  m.receiveShadow = true;
  return m;
}
