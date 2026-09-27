import * as THREE from "three";
import type { CharacterId } from "../game/types";
import { type Character, character } from "./characters";
import { C, mat, mesh } from "./palette";
import {
  bellPost,
  campfire,
  chair,
  hammock,
  island,
  kettle,
  oak,
  picnicTable,
  pine,
  sunClock,
  tent,
  windsock,
} from "./props";
import { basket, blanket, book, jug, pegs } from "./smallProps";

/**
 * Every persistent object in the campground. Cases rearrange these; per-case marks
 * (drips, grooves, patches) live in `extras` and are cleared between cases.
 */
export class World {
  readonly root = new THREE.Group();
  readonly ground = new THREE.MeshStandardMaterial({ color: C.grass, roughness: 0.95 });
  readonly table = picnicTable();
  readonly chair = chair();
  readonly tent = tent();
  readonly fire = campfire();
  readonly kettle = kettle();
  readonly bellPost = bellPost();
  readonly bell: THREE.Object3D;
  readonly sunClock = sunClock();
  readonly windsock = windsock();
  readonly basket = basket();
  readonly jug = jug();
  readonly book = book();
  readonly blanket = blanket();
  readonly pegs = pegs();
  readonly extras = new THREE.Group();
  readonly cast: Record<CharacterId, Character> = {
    gus: character("gus"),
    marge: character("marge"),
    pip: character("pip"),
  };
  private hammockMesh: THREE.Group | null = null;

  constructor() {
    this.root.add(island(this.ground));
    const theOak = oak();
    theOak.position.set(-4.4, 0, 0);
    const pines: [number, number, number][] = [
      [-2.6, -5.2, 1.1],
      [1.4, -5.8, 1.3],
      [4.9, -3.9, 1],
      [-6.1, -2.7, 0.9],
      [6.3, -0.9, 0.8],
      [-5.9, 3.3, 0.75],
    ];
    for (const [x, z, s] of pines) {
      const p = pine(s);
      p.position.set(x, 0, z);
      this.root.add(p);
    }
    this.bellPost.position.set(3.8, 0, 0.6);
    this.bell = this.bellPost.getObjectByName("bell") as THREE.Object3D;
    this.fire.position.set(-1.4, 0, 2.9);
    this.sunClock.position.set(-0.6, 0, -3.0);
    this.windsock.position.set(5.6, 0, 1.2);
    const path = mesh(new THREE.CircleGeometry(1.5, 20), mat(C.path), 0.8, 0.004, 0.6);
    path.rotation.x = -Math.PI / 2;
    path.scale.set(1.5, 1, 1);
    path.castShadow = false;
    this.root.add(
      path,
      theOak,
      this.bellPost,
      this.fire,
      this.sunClock,
      this.windsock,
      this.table,
      this.chair,
      this.tent,
      this.kettle,
      this.basket,
      this.jug,
      this.book,
      this.blanket,
      this.pegs,
      this.extras,
    );
    for (const c of Object.values(this.cast)) this.root.add(c.root);
  }

  /** Re-sling the hammock between two points, or remove it. */
  setHammock(a: THREE.Vector3 | null, b?: THREE.Vector3, sag = 0.45) {
    if (this.hammockMesh) {
      this.root.remove(this.hammockMesh);
      for (const m of this.hammockMesh.children) (m as THREE.Mesh).geometry.dispose();
      this.hammockMesh = null;
    }
    if (a && b) {
      this.hammockMesh = hammock(a, b, sag);
      this.root.add(this.hammockMesh);
    }
  }

  get hammock() {
    return this.hammockMesh;
  }

  /** Put every movable object back to a neutral pose before a case arranges them. */
  reset() {
    this.extras.clear();
    this.setHammock(null);
    const movable: THREE.Object3D[] = [
      this.table,
      this.chair,
      this.tent,
      this.kettle,
      this.basket,
      this.jug,
      this.book,
      this.blanket,
      this.pegs,
    ];
    for (const o of movable) {
      o.visible = true;
      o.rotation.set(0, 0, 0);
      o.scale.setScalar(1);
    }
    this.bell.rotation.set(0, 0, 0);
    for (const c of Object.values(this.cast)) {
      c.root.visible = true;
      c.root.rotation.set(0, 0, 0);
      c.body.position.set(0, 0, 0);
      c.cape.visible = false;
      for (const e of c.eyes) e.scale.y = 1;
    }
    this.asleep.clear();
    this.ground.color.setHex(C.grass);
  }

  readonly asleep = new Set<CharacterId>();

  sleep(id: CharacterId, asleep: boolean) {
    if (asleep) this.asleep.add(id);
    else this.asleep.delete(id);
    for (const e of this.cast[id].eyes) e.scale.y = asleep ? 0.15 : 1;
  }
}

export function place(o: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  o.position.set(x, y, z);
  o.rotation.set(0, ry, 0);
}

/** A character lying along the x axis, as if in a hammock. */
export function lieDown(o: THREE.Object3D, x: number, y: number, z: number) {
  o.position.set(x, y, z);
  o.rotation.set(0, 0, Math.PI / 2);
}
