import gsap from "gsap";
import * as THREE from "three";
import { cue } from "../cues";
import { rain } from "../effects";
import { C } from "../palette";
import { flatPatch, puddle } from "../smallProps";
import { place, type World } from "../world";
import { faceFront, type Stage, v, walk } from "./stage";

// Case 2: nobody stole the tent. Gus is wearing it.

const PITCH = v(2.6, 0, -2.4);
const PITCH_RY = -0.3;
const STACK = v(3.75, 0.03, -1.35);
const KETTLE_TIPPED = v(-0.95, 0.06, 3.25);
const up = new THREE.Vector3(0, 1, 0);

let marks: { dry: THREE.Mesh; rain: THREE.InstancedMesh; puddle: THREE.Mesh } | null = null;

function corner(i: number) {
  const local = v(i & 1 ? 1.0 : -1.0, 0.1, i & 2 ? 1.0 : -1.0).applyAxisAngle(up, PITCH_RY);
  return local.add(PITCH);
}

function build(w: World) {
  const dry = flatPatch(1.9, 1.9, C.grass);
  dry.position.set(PITCH.x, 0.015, PITCH.z);
  dry.rotation.z = PITCH_RY;
  const r = rain();
  const p = puddle();
  p.position.set(-0.7, 0.015, 3.35);
  w.extras.add(dry, r, p);
  marks = { dry, rain: r, puddle: p };
  return marks;
}

function common(w: World) {
  place(w.table, 0.6, 0, 0.4);
  place(w.chair, 1.9, 0, 1.3, -0.5);
  for (const o of [w.basket, w.jug, w.book, w.blanket]) o.visible = false;
  place(w.cast.marge.root, -2.3, 0, 2.0, 0.6);
  place(w.cast.pip.root, 3.9, 0, 2.1, -0.3);
}

export const tentStage: Stage = {
  anchors: {
    pitch: v(PITCH.x, 0.3, PITCH.z),
    kettle: v(KETTLE_TIPPED.x, 0.45, KETTLE_TIPPED.z),
    windsock: v(5.6, 2.3, 1.2),
  },

  found(w) {
    build(w);
    common(w);
    w.ground.color.setHex(C.grassWet);
    place(w.tent, PITCH.x, 0, PITCH.z, PITCH_RY);
    w.tent.visible = false;
    w.cast.gus.cape.visible = true;
    place(w.cast.gus.root, -0.3, 0, 2.3, -0.4);
    place(w.kettle, KETTLE_TIPPED.x, KETTLE_TIPPED.y, KETTLE_TIPPED.z, 0.4);
    w.kettle.rotation.z = 1.4;
    w.pegs.position.set(0, 0, 0);
    w.pegs.children.forEach((peg, i) => {
      peg.position.set(STACK.x, STACK.y + (i > 1 ? 0.05 : 0), STACK.z + (i % 2) * 0.06);
      peg.rotation.set(0, 0, Math.PI / 2);
    });
  },

  before(w) {
    const m = build(w);
    common(w);
    m.dry.visible = false;
    m.rain.visible = false;
    m.puddle.visible = false;
    place(w.tent, PITCH.x, 0, PITCH.z, PITCH_RY);
    place(w.cast.gus.root, 1.3, 0, -0.9, 0.3);
    place(w.kettle, -1.4, 0.12, 2.9);
    w.pegs.position.set(0, 0, 0);
    w.pegs.children.forEach((peg, i) => {
      peg.position.copy(corner(i));
      peg.rotation.set(0, 0, 0);
    });
  },

  event(w, id, tl) {
    const m = marks;
    if (!m) return;
    const gus = w.cast.gus;
    if (id === "rain") {
      tl.add(() => {
        m.rain.visible = true;
        // The patch only stays dry if the tent is still standing over it.
        m.dry.visible = w.tent.visible;
        cue("cloth");
      });
      const wet = new THREE.Color(C.grassWet);
      tl.to(w.ground.color, { r: wet.r, g: wet.g, b: wet.b, duration: 1.4 });
    } else if (id === "pegs") {
      walk(tl, gus.root, v(PITCH.x - 0.4, 0, PITCH.z + 1.3), 0.8);
      w.pegs.children.forEach((peg, i) => {
        tl.add(() => cue("peg"), i ? "<0.15" : ">");
        tl.to(
          peg.position,
          {
            x: STACK.x,
            y: STACK.y + (i > 1 ? 0.05 : 0),
            z: STACK.z + (i % 2) * 0.06,
            duration: 0.3,
          },
          i ? "<0.15" : ">",
        );
        tl.to(peg.rotation, { z: Math.PI / 2, duration: 0.3 }, "<");
      });
      tl.to(w.tent.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.5, ease: "back.in" });
      tl.add(() => {
        w.tent.visible = false;
        gus.cape.visible = true;
        cue("cloth");
      });
      tl.fromTo(
        gus.cape.scale,
        { x: 0.2, y: 0.2, z: 0.2 },
        { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out" },
      );
      faceFront(tl, gus.root);
    } else if (id === "kettle") {
      walk(tl, gus.root, v(-0.9, 0, 2.5), 1.1);
      tl.to(w.kettle.position, {
        x: KETTLE_TIPPED.x,
        y: KETTLE_TIPPED.y,
        z: KETTLE_TIPPED.z,
        duration: 0.4,
      });
      tl.to(w.kettle.rotation, { z: 1.4, y: 0.4, duration: 0.4, ease: "bounce.out" }, "<");
      tl.add(() => {
        m.puddle.visible = true;
        cue("kettle");
      });
      tl.fromTo(m.puddle.scale, { x: 0.1, y: 0.1 }, { x: 1, y: 0.6, duration: 0.5 });
      walk(tl, gus.root, v(-0.3, 0, 2.3), 0.4);
      faceFront(tl, gus.root);
    }
  },

  explain(w, id, tl) {
    const gus = w.cast.gus;
    if (id === "poncho") {
      tl.add(() => cue("cloth"));
      tl.to(gus.root.rotation, { y: "+=6.283", duration: 0.9, ease: "power2.inOut" });
      tl.to(gus.cape.scale, { x: 1.25, z: 1.25, duration: 0.3, yoyo: true, repeat: 1 }, "<0.2");
    } else {
      const flyer = w.tent.clone();
      flyer.visible = true;
      flyer.scale.setScalar(1);
      place(flyer, PITCH.x, 0, PITCH.z, PITCH_RY);
      w.extras.add(flyer);
      tl.add(() => cue("cloth"));
      tl.to(flyer.position, { x: 4.6, y: 2.4, z: 2.5, duration: 1.1, ease: "power1.out" });
      tl.to(flyer.rotation, { x: 1.2, z: 0.8, duration: 1.1 }, "<");
      tl.to(flyer.position, { y: -0.6, duration: 0.5, ease: "power2.in" });
      tl.add(() => {
        flyer.visible = false;
      });
      // The windsock does not so much as twitch.
      const sock = w.windsock.getObjectByName("sock");
      if (sock)
        tl.add(gsap.to(sock.rotation, { z: 0.02, duration: 0.2, yoyo: true, repeat: 1 }), "<");
    }
  },
};
