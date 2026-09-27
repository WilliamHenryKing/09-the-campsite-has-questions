import * as THREE from "three";
import { raccoon } from "../characters";
import { cue } from "../cues";
import { C, mat, mesh } from "../palette";
import { drip, groovePair, revealTrail, trail } from "../smallProps";
import { lieDown, place, type World } from "../world";
import { faceFront, type Stage, v, walk } from "./stage";

// Case 1: the picnic crept across camp after the shade.

// The oak's afternoon shade falls in front of it (the sun is behind the camp), so the move is visible.
const GROOVE_PATH = [
  v(0.6, 0, 1.45),
  v(-1.0, 0, 1.0),
  v(-1.9, 0, 1.3),
  v(-2.9, 0, 1.1),
  v(-4.0, 0, 2.0),
];
const DRIP_PATH = [v(0.1, 0, 1.0), v(-1.0, 0, 1.7), v(-2.4, 0, 1.0), v(-4.4, 0, 2.35)];
const BOOK_DOWN = v(-1.9, 0.01, 0.62);
const SHADE = {
  chair: v(-4.0, 0, 2.0),
  basket: v(-4.75, 0, 2.45),
  jug: v(-3.35, 0, 2.5),
  pip: v(-4.9, 0, 1.4),
};

let marks: {
  grooves: THREE.Group;
  groove: THREE.Curve<THREE.Vector3>;
  drips: THREE.Group;
  drip: THREE.Curve<THREE.Vector3>;
} | null = null;

function build(w: World) {
  const g = trail(GROOVE_PATH, 0.22, groovePair());
  const d = trail(DRIP_PATH, 0.3, drip);
  for (const x of [-2.95, -0.85]) {
    w.extras.add(mesh(new THREE.BoxGeometry(0.1, 1.05, 0.1), mat(C.woodDark), x, 0.52, 0.2));
  }
  w.extras.add(g.group, d.group);
  w.setHammock(v(-2.9, 1, 0.2), v(-0.9, 1, 0.2), 0.4);
  marks = { grooves: g.group, groove: g.curve, drips: d.group, drip: d.curve };
  return marks;
}

function common(w: World) {
  place(w.table, 0.6, 0, 0.4);
  place(w.cast.gus.root, 3.3, 0, 1.6, -0.4);
  lieDown(w.cast.marge.root, -1.35, 0.72, 0.2);
  place(w.tent, 2.6, 0, -2.4, -0.3);
  w.pegs.visible = false;
}

export const picnicStage: Stage = {
  anchors: {
    book: v(-1.9, 0.3, 0.62),
    drips: v(-1.0, 0.3, 1.7),
    sunclock: v(-0.6, 1.0, -3.0),
  },

  found(w) {
    build(w);
    common(w);
    w.sleep("marge", true);
    place(w.chair, SHADE.chair.x, 0, SHADE.chair.z, 0.3);
    place(w.basket, SHADE.basket.x, 0, SHADE.basket.z, 0.3);
    place(w.blanket, SHADE.basket.x, 0, SHADE.basket.z, 0.3);
    place(w.jug, SHADE.jug.x, 0, SHADE.jug.z);
    place(w.book, BOOK_DOWN.x, BOOK_DOWN.y, BOOK_DOWN.z, 0.7);
    place(w.cast.pip.root, SHADE.pip.x, 0, SHADE.pip.z, 0.3);
  },

  before(w) {
    const m = build(w);
    common(w);
    revealTrail(m.grooves, 0);
    revealTrail(m.drips, 0);
    place(w.chair, 0.6, 0, 1.35, Math.PI);
    place(w.basket, 0.25, 0.82, 0.35);
    place(w.jug, 0.95, 0.82, 0.3);
    place(w.blanket, 1.05, 0.82, 0.55);
    w.blanket.scale.setScalar(0.35);
    place(w.book, -1.55, 1.12, 0.35, 0.3);
    place(w.cast.pip.root, 1.7, 0, 2.1);
  },

  event(w, id, tl) {
    const m = marks;
    if (!m) return;
    if (id === "nap") {
      tl.add(() => {
        w.sleep("marge", true);
        cue("book");
      });
      tl.to(w.book.position, {
        x: BOOK_DOWN.x,
        y: BOOK_DOWN.y,
        z: BOOK_DOWN.z,
        duration: 0.7,
        ease: "bounce.out",
      });
      tl.to(w.book.rotation, { y: 0.7, z: 0.4, duration: 0.35, yoyo: true, repeat: 1 }, "<");
    } else if (id === "chair") {
      const pip = w.cast.pip.root;
      walk(tl, pip, v(0.9, 0, 1.9), 0.5);
      tl.add(() => cue("creak"));
      const p = { t: 0 };
      tl.to(p, {
        t: 1,
        duration: 1.6,
        ease: "power1.inOut",
        onUpdate: () => {
          const at = m.groove.getPointAt(p.t);
          const tan = m.groove.getTangentAt(p.t);
          w.chair.position.copy(at);
          w.chair.rotation.y = Math.atan2(-tan.x, -tan.z);
          pip.position.set(at.x - tan.x * 0.7, 0, at.z - tan.z * 0.7);
          pip.rotation.y = Math.atan2(tan.x, tan.z);
          revealTrail(m.grooves, p.t);
        },
      });
      tl.to(w.chair.rotation, { y: 0.4, duration: 0.3 });
      tl.add(() => cue("creak"));
    } else if (id === "basket") {
      const pip = w.cast.pip.root;
      walk(tl, pip, v(0.1, 0, 1.2), 0.7);
      const p = { t: 0 };
      tl.to(p, {
        t: 1,
        duration: 1.8,
        ease: "none",
        onUpdate: () => {
          const at = m.drip.getPointAt(p.t);
          const tan = m.drip.getTangentAt(p.t);
          pip.position.set(at.x, 0, at.z);
          pip.rotation.y = Math.atan2(tan.x, tan.z);
          w.basket.position.set(at.x + 0.25, 0.45, at.z);
          w.jug.position.set(at.x - 0.25, 0.45, at.z);
          w.blanket.position.set(at.x, 0.7, at.z);
          revealTrail(m.drips, p.t);
        },
      });
      tl.add(() => cue("thud"));
      tl.to(w.basket.position, { x: SHADE.basket.x, y: 0, z: SHADE.basket.z, duration: 0.4 });
      tl.to(w.jug.position, { x: SHADE.jug.x, y: 0, z: SHADE.jug.z, duration: 0.4 }, "<");
      tl.to(w.blanket.position, { x: SHADE.basket.x, y: 0, z: SHADE.basket.z, duration: 0.5 }, "<");
      tl.to(w.blanket.scale, { x: 1, y: 1, z: 1, duration: 0.5 }, "<");
      walk(tl, pip, SHADE.pip, 0.3);
      faceFront(tl, pip);
    }
  },

  explain(w, id, tl) {
    if (id === "shade") {
      const pip = w.cast.pip.root;
      walk(tl, pip, v(SHADE.chair.x, 0.25, SHADE.chair.z + 0.05), 0.5);
      tl.to(pip.rotation, { y: 0.4, duration: 0.3 });
      tl.add(() => cue("cloth"));
      tl.to(w.cast.pip.body.scale, { x: 1.12, y: 0.9, duration: 0.3, yoyo: true, repeat: 1 });
    } else {
      const r = raccoon();
      place(r, -6.5, 0, 3);
      w.extras.add(r);
      walk(tl, r, v(0.6, 0.85, 0.4), 1.0);
      tl.to(r.rotation, { y: "+=6.28", duration: 0.5 });
      walk(tl, r, v(6.5, 0, -2.5), 0.9);
      tl.set(r, { visible: false });
    }
  },
};
