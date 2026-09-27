import * as THREE from "three";
import { cue } from "../cues";
import type { World } from "../world";

/** How one case arranges and animates the shared campground. */
export interface Stage {
  /** Arrange the scene as the player finds it. */
  found(w: World): void;
  /** Arrange the scene as it was before anything happened, for the reconstruction. */
  before(w: World): void;
  /** Append one event beat to a timeline. */
  event(w: World, id: string, tl: gsap.core.Timeline): void;
  /** Append the closing vignette for an explanation. */
  explain(w: World, id: string, tl: gsap.core.Timeline): void;
  /** Where each clue's tag floats. */
  anchors: Record<string, THREE.Vector3>;
}

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Walk an object to a point with a little bounce, turning to face the way it goes. */
export function walk(
  tl: gsap.core.Timeline,
  o: THREE.Object3D,
  to: THREE.Vector3,
  duration = 0.9,
  at?: string | number,
) {
  tl.add(() => {
    o.rotation.y = Math.atan2(to.x - o.position.x, to.z - o.position.z);
  }, at);
  tl.to(o.position, { x: to.x, y: to.y, z: to.z, duration, ease: "power1.inOut" }, "<");
  const body = o.children[0];
  // An odd repeat count makes the yoyo land back on the ground.
  const hops = Math.max(1, Math.round(duration / 0.12)) | 1;
  if (body) {
    let n = 0;
    const footfall = () => {
      if (n++ % 2 === 0) cue("step");
    };
    tl.to(
      body.position,
      { y: 0.08, duration: 0.12, yoyo: true, repeat: hops, onStart: footfall, onRepeat: footfall },
      "<",
    );
  }
}

/** Swing the bell a few times. */
export function ring(tl: gsap.core.Timeline, bell: THREE.Object3D, at?: string | number) {
  tl.add(() => cue("bell"), at);
  tl.to(bell.rotation, { z: 0.5, duration: 0.12, yoyo: true, repeat: 5, ease: "sine.inOut" }, "<");
  tl.set(bell.rotation, { z: 0 });
}

/** Quickly face the camera, for characters finishing a beat. */
export function faceFront(tl: gsap.core.Timeline, o: THREE.Object3D, at?: string | number) {
  tl.to(o.rotation, { y: 0, duration: 0.25 }, at);
}
