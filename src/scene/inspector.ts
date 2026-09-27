import * as THREE from "three";
import { sample } from "./samples";

// The evidence turntable: a separate little scene holding one sample the player can turn.

export class Inspector {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  private holder = new THREE.Group();
  private yaw = 0.6;
  private pitch = 0.45;
  private spin = true;

  constructor() {
    this.scene.background = new THREE.Color(0x2c2a33);
    const key = new THREE.DirectionalLight(0xfff0dc, 3);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const fill = new THREE.HemisphereLight(0xdfe8ff, 0x3a3440, 1.3);
    this.scene.add(key, fill, this.holder);
    this.camera.position.set(0, 0.6, 7);
    this.camera.lookAt(0, 0, 0);
  }

  show(id: string) {
    this.holder.clear();
    const s = sample(id);
    this.holder.add(s);
    this.yaw = 0.6;
    this.pitch = 0.45;
    this.spin = true;
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    // Keep the sample clear of the fact card: to the left on wide screens, above it on tall ones.
    if (aspect < 1) {
      this.camera.position.set(0, -0.4, 5.5 / Math.max(aspect, 0.45));
      this.camera.lookAt(0, -1.6, 0);
    } else {
      this.camera.position.set(1.6, 0.6, 7);
      this.camera.lookAt(1.6, 0, 0);
    }
    this.camera.updateProjectionMatrix();
  }

  /** Turn by a drag or key delta, in radians. Stops the idle spin for good. */
  turn(dYaw: number, dPitch: number) {
    this.spin = false;
    this.yaw += dYaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -1.4, 1.4);
  }

  update(dt: number, reducedMotion: boolean) {
    if (this.spin && !reducedMotion) this.yaw += dt * 0.35;
    this.holder.rotation.set(this.pitch, this.yaw, 0, "XYZ");
  }
}
