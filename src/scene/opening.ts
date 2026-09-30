import * as THREE from "three";

const query = new URLSearchParams(location.search);
export const wantsTitle = query.has("intro") || (!import.meta.env.DEV && !query.has("e2e"));
export type OpeningPhase = "title" | "glide" | "done";
const ease = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Follow a small piece of evidence out into the whole, suspiciously peaceful camp. */
export class Opening {
  phase: OpeningPhase = wantsTitle ? "title" : "done";
  onDone: (() => void) | null = null;
  private time = 0;
  private eye = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private fov = 38;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();

  begin(reduced: boolean) {
    if (this.phase !== "title") return;
    this.phase = reduced ? "done" : "glide";
    this.time = 0;
    if (reduced) this.onDone?.();
  }

  update(camera: THREE.PerspectiveCamera, dt: number, reduced: boolean) {
    if (reduced && this.phase === "glide") {
      this.phase = "done";
      this.onDone?.();
    }
    if (this.phase === "done") {
      if (camera.view?.enabled) camera.clearViewOffset();
      return;
    }
    const veil = document.getElementById("arrival");
    if (!veil || veil.classList.contains("is-done")) this.time += dt;
    const phone = camera.aspect < 0.85;
    let weight = 1;
    if (this.phase === "title") {
      const t = reduced ? 1 : ease(this.time / 10);
      this.from.set(-5.4, 2.5, phone ? 16 : 8.5);
      this.to.set(9, phone ? 18 : 11, phone ? 30 : 17);
      camera.position.copy(this.from).lerp(this.to, t);
      if (!reduced) camera.position.y += Math.sin(this.time * 0.3) * 0.06;
      this.from.set(-3.1, 0.7, 1.2);
      this.to.set(0, 0.8, 0);
      camera.lookAt(this.from.lerp(this.to, t));
      camera.fov = phone ? 46 : 38;
      this.eye.copy(camera.position);
      this.rotation.copy(camera.quaternion);
      this.fov = camera.fov;
    } else {
      const t = ease(this.time / 2.8);
      camera.position.lerp(this.eye, 1 - t);
      camera.position.y += Math.sin(Math.PI * t) * 1.1;
      camera.quaternion.slerp(this.rotation, 1 - t);
      camera.fov = THREE.MathUtils.lerp(this.fov, camera.fov, t);
      weight = 1 - t;
      if (t === 1) {
        this.phase = "done";
        this.onDone?.();
      }
    }
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      phone ? 0 : -innerWidth * 0.18 * weight,
      phone ? -innerHeight * 0.2 * weight : 0,
      innerWidth,
      innerHeight,
    );
    camera.updateProjectionMatrix();
  }
}
