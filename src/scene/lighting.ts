import * as THREE from "three";
import type { CaseDef } from "../game/types";

// One key light plus a hemisphere fill, retuned for each visit to the campground.

const LOOKS: Record<
  CaseDef["time"],
  { sky: number; key: number; keyI: number; keyPos: [number, number, number]; hemi: [number, number, number] }
> = {
  afternoon: { sky: 0xf1d9ab, key: 0xffe2b5, keyI: 3.2, keyPos: [2, 10, 8], hemi: [0xd6e6ff, 0x7c8f55, 1.15] },
  rain: { sky: 0x8d99a7, key: 0xc9d6e6, keyI: 1.4, keyPos: [3, 10, 6], hemi: [0xb0bfcf, 0x55664a, 1.5] },
  dawn: { sky: 0xeebdad, key: 0xffbf96, keyI: 2.7, keyPos: [9, 5, 5], hemi: [0xf5c8d8, 0x6d7a5a, 1.05] },
};

export class Lighting {
  readonly key = new THREE.DirectionalLight(0xffffff, 3);
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);

  constructor(scene: THREE.Scene) {
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    const cam = this.key.shadow.camera;
    cam.left = -9;
    cam.right = 9;
    cam.top = 9;
    cam.bottom = -9;
    cam.near = 1;
    cam.far = 30;
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 4;
    scene.add(this.key, this.key.target, this.hemi);
  }

  apply(scene: THREE.Scene, time: CaseDef["time"]) {
    const l = LOOKS[time];
    const sky = new THREE.Color(l.sky);
    scene.background = sky;
    scene.fog = new THREE.Fog(sky, 30, 70);
    this.key.color.setHex(l.key);
    this.key.intensity = l.keyI;
    this.key.position.set(...l.keyPos);
    this.hemi.color.setHex(l.hemi[0]);
    this.hemi.groundColor.setHex(l.hemi[1]);
    this.hemi.intensity = l.hemi[2];
  }
}
