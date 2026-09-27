import * as THREE from "three";
import { C, group, mat, mesh } from "./palette";
import { kettle, sunClock, windsock } from "./props";
import { basket, book, drip, flatPatch, groovePair, jug, pegs, puddle, trail } from "./smallProps";

// Evidence samples: each clue as a small turf tile you can pick up and turn over.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function turf(color: number = C.grass): THREE.Group {
  const soil = mesh(
    new THREE.BoxGeometry(2.2, 0.3, 2.2),
    mat(C.earth, { flat: true }),
    0,
    -0.15,
    0,
  );
  const top = flatPatch(2.2, 2.2, color);
  top.position.y = 0.002;
  return group(soil, top);
}

const SAMPLES: Record<string, () => THREE.Group> = {
  book: () => {
    const g = turf();
    const path = [
      v(-1.05, 0, 0.7),
      v(-0.4, 0, 0.55),
      v(0, 0, 0.2),
      v(0.45, 0, 0.5),
      v(1.05, 0, 0.75),
    ];
    g.add(trail(path, 0.16, groovePair(0.3)).group);
    const b = book();
    b.scale.setScalar(2);
    b.position.set(0, 0, -0.35);
    b.rotation.y = 0.5;
    return g.add(b);
  },
  drips: () => {
    const g = turf();
    g.add(trail([v(-1.05, 0, 0.1), v(1.05, 0, -0.1)], 0.16, groovePair(0.5)).group);
    const d = trail([v(-0.2, 0, 1), v(0.1, 0, 0), v(0.4, 0, -1)], 0.3, drip).group;
    for (const c of d.children) c.scale.setScalar(1.3);
    d.scale.set(1.3, 1, 1);
    const j = jug();
    j.position.set(0.8, 0, 0.7);
    j.scale.setScalar(1.6);
    return g.add(d, j);
  },
  sunclock: () => {
    const s = sunClock();
    s.scale.setScalar(2.4);
    s.position.y = -0.6;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tick = mesh(
        new THREE.BoxGeometry(0.035, 0.01, i % 3 ? 0.03 : 0.07),
        mat(C.ink),
        Math.cos(a) * 0.27,
        0.545,
        Math.sin(a) * 0.27,
      );
      tick.rotation.y = -a;
      s.add(tick);
    }
    return group(s);
  },
  pitch: () => {
    const g = turf(C.grassWet);
    const dry = flatPatch(1.3, 1.3, C.grass);
    dry.position.set(-0.2, 0.004, -0.2);
    const p = pegs();
    p.children.forEach((peg, i) => {
      peg.position.set(0.75, 0.04 + (i > 1 ? 0.05 : 0), 0.4 + (i % 2) * 0.07);
      peg.rotation.z = Math.PI / 2;
    });
    p.scale.setScalar(1.6);
    p.position.set(-0.45, 0, -0.3);
    return g.add(dry, p);
  },
  kettle: () => {
    const g = turf(C.grassWet);
    const k = kettle();
    k.scale.setScalar(2.6);
    k.rotation.z = 1.4;
    k.position.set(0, 0.2, 0);
    const thread = mesh(new THREE.TorusGeometry(0.1, 0.012, 4, 10), mat(C.tent), 0, 0.3, 0);
    thread.rotation.x = 1.2;
    k.add(thread);
    const tail = mesh(new THREE.BoxGeometry(0.02, 0.012, 0.25), mat(C.tent), 0.05, 0.28, 0.15);
    k.add(tail);
    const p = puddle();
    p.scale.set(2.2, 1.4, 1);
    p.position.set(0.5, 0.01, 0.3);
    return g.add(k, p);
  },
  windsock: () => {
    const w = windsock();
    w.position.y = -1.3;
    const g = group(w);
    for (let i = 0; i < 6; i++) {
      const d = mesh(
        new THREE.SphereGeometry(0.025, 6, 4),
        mat(0xdbe7f2),
        0.05 + (i % 2) * 0.06,
        0.1 - i * 0.12,
        0.05,
      );
      g.add(d);
    }
    return g;
  },
  knots: () => {
    const leg = mesh(
      new THREE.BoxGeometry(0.3, 2.0, 0.3),
      mat(C.woodDark, { flat: true }),
      0,
      0,
      0,
    );
    const g = group(leg);
    for (let i = 0; i < 4; i++) {
      const wrap = mesh(
        new THREE.TorusGeometry(0.23, 0.05, 6, 16),
        mat(C.rope),
        0,
        -0.2 + i * 0.12,
        0,
      );
      wrap.rotation.x = Math.PI / 2;
      g.add(wrap);
    }
    const line = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), mat(C.rope), 0.8, 0, 0);
    line.rotation.z = Math.PI / 2 - 0.2;
    g.add(line);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 * 3;
      const r = 0.29;
      const bead = mesh(
        new THREE.SphereGeometry(0.022, 6, 4),
        mat(0xe8f2fb, { rough: 0.1 }),
        Math.cos(a) * r,
        -0.22 + (i / 26) * 0.4,
        Math.sin(a) * r,
      );
      g.add(bead);
    }
    return g;
  },
  grooves: () => {
    const g = turf(C.grassDew);
    g.add(trail([v(-1.05, 0, 0), v(1.05, 0, 0)], 0.14, groovePair(0.9)).group);
    const sparkle = new THREE.Group();
    for (let i = 0; i < 70; i++) {
      const x = (Math.random() - 0.5) * 2;
      const z = (Math.random() - 0.5) * 2;
      if (Math.abs(Math.abs(z) - 0.45) < 0.08) continue;
      sparkle.add(
        mesh(new THREE.SphereGeometry(0.018, 5, 3), mat(0xf4fbff, { rough: 0.1 }), x, 0.015, z),
      );
    }
    return g.add(sparkle);
  },
  cord: () => {
    const bell = mesh(
      new THREE.CylinderGeometry(0.2, 0.5, 0.7, 16),
      mat(C.brass, { rough: 0.35 }),
      0,
      0.7,
      0,
    );
    const cord = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5), mat(C.rope), 0, -0.2, 0);
    const knot = mesh(new THREE.TorusKnotGeometry(0.08, 0.03, 32, 6), mat(C.rope), 0, -0.8, 0);
    const line = mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 6), mat(C.canvas), 0, -0.8, 0);
    line.rotation.z = Math.PI / 2 - 0.25;
    return group(bell, cord, knot, line);
  },
};

/** Fallback so an unknown id still shows something rather than nothing. */
export function sample(id: string): THREE.Group {
  const make = SAMPLES[id];
  return make ? make() : group(basket());
}
