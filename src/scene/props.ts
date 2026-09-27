import * as THREE from "three";
import { C, group, mat, mesh } from "./palette";

// Large set pieces: the island, trees, furniture and fixtures of the campground.

export function island(ground: THREE.MeshStandardMaterial): THREE.Group {
  const shape = new THREE.CylinderGeometry(7.6, 7.1, 1.2, 40, 1);
  const pos = shape.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const wobble = 1 + 0.035 * Math.sin(Math.atan2(z, x) * 5) + 0.02 * Math.cos(x * 1.7);
    pos.setX(i, x * wobble);
    pos.setZ(i, z * wobble);
  }
  shape.computeVertexNormals();
  const earth = mesh(shape, mat(C.earth, { flat: true }), 0, -0.6, 0);
  const top = mesh(new THREE.CircleGeometry(7.45, 40), ground, 0, 0.001, 0);
  top.rotation.x = -Math.PI / 2;
  top.castShadow = false;
  const lake = mesh(new THREE.CircleGeometry(1, 32), mat(C.water, { rough: 0.25 }), 4.4, 0.01, 3.7);
  lake.rotation.x = -Math.PI / 2;
  lake.scale.set(2.2, 1.4, 1);
  lake.castShadow = false;
  const g = group(earth, top, lake);
  const stones = new THREE.DodecahedronGeometry(0.22, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const s = mesh(stones, mat(C.stone, { flat: true }), 4.4 + Math.cos(a) * 2.3, 0.05, 3.7 + Math.sin(a) * 1.5);
    s.scale.setScalar(0.6 + (i % 3) * 0.25);
    g.add(s);
  }
  return g;
}

export function oak(): THREE.Group {
  const trunk = mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 7), mat(C.bark, { flat: true }), 0, 1.1, 0);
  const g = group(trunk);
  const blobs: [number, number, number, number][] = [
    [0, 2.9, 0, 1.3],
    [0.8, 2.6, 0.3, 0.9],
    [-0.8, 2.7, -0.2, 0.95],
    [0.1, 3.5, -0.3, 0.85],
  ];
  blobs.forEach(([x, y, z, r], i) => {
    const b = mesh(new THREE.IcosahedronGeometry(r, 1), mat(i % 2 ? C.leafDark : C.leaf, { flat: true }), x, y, z);
    g.add(b);
  });
  return g;
}

export function pine(scale = 1): THREE.Group {
  const g = group(mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 6), mat(C.bark), 0, 0.3, 0));
  for (let i = 0; i < 3; i++) {
    const cone = mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 1.1, 7), mat(C.pine, { flat: true }), 0, 0.9 + i * 0.6, 0);
    g.add(cone);
  }
  g.scale.setScalar(scale);
  return g;
}

export function picnicTable(): THREE.Group {
  const wood = mat(C.wood, { flat: true });
  const g = group(mesh(new THREE.BoxGeometry(2.2, 0.08, 0.9), wood, 0, 0.78, 0));
  for (const z of [-0.72, 0.72]) g.add(mesh(new THREE.BoxGeometry(2.2, 0.07, 0.3), wood, 0, 0.45, z));
  for (const x of [-0.85, 0.85]) {
    for (const s of [-1, 1]) {
      const leg = mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), mat(C.woodDark), x, 0.4, s * 0.45);
      leg.rotation.x = s * 0.5;
      g.add(leg);
    }
  }
  return g;
}

export function chair(): THREE.Group {
  const canvas = mat(C.check);
  const frame = mat(C.woodDark);
  const g = group(
    mesh(new THREE.BoxGeometry(0.6, 0.06, 0.55), canvas, 0, 0.45, 0),
    mesh(new THREE.BoxGeometry(0.6, 0.55, 0.05), canvas, 0, 0.75, -0.28),
  );
  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.25, 0.25]) g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 5), frame, x, 0.22, z));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), frame, x, 0.62, 0));
  }
  return g;
}

export function tent(): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(-0.9, 0);
  shape.lineTo(0, 1.25);
  shape.lineTo(0.9, 0);
  shape.lineTo(-0.9, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: false });
  geo.translate(0, 0, -0.9);
  const body = mesh(geo, mat(C.tent, { flat: true }));
  const door = mesh(new THREE.PlaneGeometry(0.6, 0.8), mat(0x3f5f48), 0, 0.4, 0.905);
  const g = group(body, door);
  for (const z of [-0.95, 0.95]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), mat(C.metal), 0, 0.7, z));
  return g;
}

export function campfire(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.DodecahedronGeometry(0.14, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(stone, mat(C.stone, { flat: true }), Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45));
  }
  for (let i = 0; i < 3; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5), mat(C.bark), 0, 0.1, 0);
    log.rotation.set(Math.PI / 2, 0, (i / 3) * Math.PI);
    log.rotation.order = "ZXY";
    g.add(log);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.5, 6),
    new THREE.MeshBasicMaterial({ color: C.flame, transparent: true, opacity: 0.9 }),
  );
  flame.position.y = 0.35;
  flame.name = "flame";
  g.add(flame);
  return g;
}

export function kettle(): THREE.Group {
  const metal = mat(C.metal, { rough: 0.45 });
  const body = mesh(new THREE.SphereGeometry(0.2, 12, 8), metal, 0, 0.16, 0);
  body.scale.y = 0.8;
  const spout = mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.22, 6), metal, 0.2, 0.2, 0);
  spout.rotation.z = -0.9;
  const handle = mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 12, Math.PI), mat(C.ink), 0, 0.3, 0);
  return group(body, spout, handle);
}

export function bellPost(): THREE.Group {
  const wood = mat(C.woodDark, { flat: true });
  const post = mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), wood, 0, 1.2, 0);
  const arm = mesh(new THREE.BoxGeometry(0.8, 0.12, 0.12), wood, -0.35, 2.3, 0);
  const bell = new THREE.Group();
  bell.name = "bell";
  bell.position.set(-0.6, 2.24, 0);
  const cup = mesh(new THREE.CylinderGeometry(0.09, 0.22, 0.32, 14, 1, true), mat(C.brass, { rough: 0.35 }), 0, -0.2, 0);
  (cup.material as THREE.Material).side = THREE.DoubleSide;
  bell.add(cup, mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(C.ink), 0, -0.36, 0));
  const cord = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 4), mat(C.rope), 0, -0.95, 0);
  cord.name = "cord";
  bell.add(cord);
  const sign = mesh(new THREE.BoxGeometry(0.5, 0.3, 0.03), mat(C.check), 0, 1.5, 0.1);
  return group(post, arm, bell, sign);
}

export function sunClock(): THREE.Group {
  const stump = mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.5, 9), mat(C.bark, { flat: true }), 0, 0.25, 0);
  const dial = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 20), mat(C.canvas), 0, 0.52, 0);
  const gnomon = mesh(new THREE.BoxGeometry(0.02, 0.22, 0.2), mat(C.brass), 0, 0.62, 0);
  const shadow = mesh(new THREE.BoxGeometry(0.24, 0.005, 0.04), mat(C.ink), 0.14, 0.545, 0.04);
  shadow.rotation.y = -0.3;
  return group(stump, dial, gnomon, shadow);
}

export function windsock(): THREE.Group {
  const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), mat(C.metal), 0, 1.1, 0);
  const sock = mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.7, 10, 1, true), mat(C.sock), 0.05, 1.8, 0);
  (sock.material as THREE.Material).side = THREE.DoubleSide;
  sock.name = "sock";
  return group(pole, sock);
}

/** A hammock slung between two world points, sagging in the middle. */
export function hammock(a: THREE.Vector3, b: THREE.Vector3, sag = 0.45): THREE.Group {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const inner = new THREE.QuadraticBezierCurve3(a.clone().lerp(mid, 0.25), mid, b.clone().lerp(mid, 0.25));
  const bed = mesh(new THREE.TubeGeometry(inner, 12, 0.2, 6, false), mat(C.canvas, { flat: true }));
  const line = mesh(new THREE.TubeGeometry(curve, 16, 0.02, 4, false), mat(C.rope));
  return group(bed, line);
}
