import * as THREE from "three";
import { bear } from "../characters";
import { cue } from "../cues";
import { C } from "../palette";
import { groovePair, revealTrail, trail } from "../smallProps";
import { lieDown, place, type World } from "../world";
import { faceFront, ring, type Stage, v, walk } from "./stage";

// Case 3: the "bear" was a hammock tied to the picnic table and the bell cord.

const START = v(-0.6, 0, 0.4);
const END = v(0.3, 0, 0.5);
const POST_KNOT = v(3.72, 1.05, 0.6);

let grooves: THREE.Group | null = null;

function sling(w: World) {
  w.table.updateMatrixWorld();
  const knot = w.table.localToWorld(v(1.05, 0.5, 0));
  w.setHammock(knot, POST_KNOT, 0.35);
}

function build(w: World) {
  const t = trail(
    [v(START.x + 0.85, 0, START.z), v(END.x + 0.85, 0, END.z)],
    0.18,
    groovePair(0.9),
  );
  const t2 = trail(
    [v(START.x - 0.85, 0, START.z), v(END.x - 0.85, 0, END.z)],
    0.18,
    groovePair(0.9),
  );
  const g = new THREE.Group();
  g.add(...t.group.children, ...t2.group.children);
  w.extras.add(g);
  grooves = g;
  return g;
}

function common(w: World) {
  for (const o of [w.basket, w.jug, w.book, w.blanket, w.pegs]) o.visible = false;
  place(w.chair, -1.8, 0, 1.3, 0.6);
  place(w.tent, 2.6, 0, -2.4, -0.3);
  place(w.kettle, -1.4, 0.12, 2.9);
  place(w.cast.pip.root, 4.3, 0, 2.5, -0.5);
}

export const bellStage: Stage = {
  anchors: {
    knots: v(END.x + 1.05, 0.45, END.z + 0.5),
    grooves: v(END.x - 0.6, 0.25, END.z + 0.75),
    cord: v(3.2, 2.55, 0.6),
  },

  found(w) {
    build(w);
    common(w);
    w.ground.color.setHex(C.grassDew);
    place(w.table, END.x, 0, END.z, 0.1);
    sling(w);
    lieDown(w.cast.marge.root, 2.95, 0.72, 0.55);
    w.sleep("marge", true);
    place(w.cast.gus.root, 1.3, 0, -1.3, -0.2);
  },

  before(w) {
    const g = build(w);
    common(w);
    revealTrail(g, 0);
    place(w.table, START.x, 0, START.z);
    place(w.cast.marge.root, 2.3, 0, -0.7);
    place(w.cast.gus.root, 1.3, 0, -1.3, -0.2);
    w.sleep("gus", true);
  },

  event(w, id, tl) {
    const marge = w.cast.marge.root;
    if (id === "tie") {
      walk(tl, marge, v(1.6, 0, 1.2), 0.8);
      tl.add(() => {
        sling(w);
        cue("cloth");
      });
      tl.to(marge.scale, { y: 0.9, duration: 0.2, yoyo: true, repeat: 3 });
    } else if (id === "dew") {
      const dew = new THREE.Color(C.grassDew);
      tl.to(w.ground.color, { r: dew.r, g: dew.g, b: dew.b, duration: 1.4 });
    } else if (id === "lurch") {
      walk(tl, marge, v(2.4, 0, 1.2), 0.6);
      tl.add(() => {
        lieDown(marge, 2.95, 0.72, 0.55);
        cue("creak");
      });
      const p = { t: 0 };
      tl.to(p, {
        t: 1,
        duration: 0.8,
        ease: "power3.out",
        onUpdate: () => {
          w.table.position.lerpVectors(START, END, p.t);
          w.table.rotation.y = 0.1 * p.t;
          sling(w);
          if (grooves) revealTrail(grooves, p.t);
        },
      });
      ring(tl, w.bell, "<0.2");
      tl.add(() => w.sleep("gus", false));
    }
  },

  explain(w, id, tl) {
    if (id === "hammock") {
      const marge = w.cast.marge.root;
      tl.to(marge.position, { y: 0.62, duration: 0.25, yoyo: true, repeat: 3 });
      ring(tl, w.bell, "<");
    } else {
      const b = bear();
      place(b, -6.5, 0, -1.2);
      w.extras.add(b);
      walk(tl, b, v(-2.3, 0, 0.4), 1.2);
      tl.add(() => cue("thud"));
      tl.to(w.table.position, { x: "+=0.15", duration: 0.12, yoyo: true, repeat: 3 });
      ring(tl, w.bell, "<");
      walk(tl, b, v(-6.5, 0, 3), 1.0);
      tl.add(() => {
        b.visible = false;
      });
    }
    faceFront(tl, w.cast.gus.root);
  },
};
