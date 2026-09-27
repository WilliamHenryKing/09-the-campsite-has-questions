import gsap from "gsap";
import * as THREE from "three";
import type { CaseDef, CharacterId } from "../game/types";
import type { Character } from "./characters";
import { pulseRing } from "./effects";
import { Inspector } from "./inspector";
import { Lighting } from "./lighting";
import { bellStage } from "./stages/bell";
import { picnicStage } from "./stages/picnic";
import type { Stage } from "./stages/stage";
import { tentStage } from "./stages/tent";
import { World } from "./world";

export interface Anchor {
  id: string;
  x: number;
  y: number;
  onScreen: boolean;
}

const STAGES: Record<string, Stage> = { picnic: picnicStage, tent: tentStage, bell: bellStage };
const TARGET = new THREE.Vector3(0, 0.4, 0);
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const box = new THREE.Box3();

/** Owns the renderer, camera and loop; the UI talks to it through a handful of verbs. */
export class CampScene {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.5, 120);
  private lighting = new Lighting(this.scene);
  private world = new World();
  private inspector = new Inspector();
  private stage: Stage = picnicStage;
  private inspecting = false;
  private yaw = 0;
  private pitch = 0.78;
  private radius = 17;
  private timer = new THREE.Timer();
  private frame = 0;
  private running: gsap.core.Timeline | null = null;
  private listeners: ((a: Anchor[]) => void)[] = [];
  private firstFrame: (() => void) | null = null;
  private width = 1;
  private height = 1;
  readonly webgl: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private reducedMotion: boolean,
  ) {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.AgXToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } catch {
      this.renderer = null;
    }
    this.webgl = this.renderer !== null;
    this.scene.add(this.world.root);
    this.resize();
    this.loop();
  }

  onFirstFrame(cb: () => void) {
    this.firstFrame = cb;
    if (!this.renderer) cb();
  }

  onAnchors(cb: (a: Anchor[]) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  setCase(def: CaseDef) {
    this.stop();
    this.stage = STAGES[def.id] ?? picnicStage;
    this.lighting.apply(this.scene, def.time);
    this.showFound();
  }

  showFound() {
    this.stop();
    this.world.reset();
    this.stage.found(this.world);
  }

  inspect(clueId: string | null) {
    this.inspecting = clueId !== null;
    if (clueId) this.inspector.show(clueId);
  }

  /** Drag or key input: turns the sample when inspecting, otherwise orbits the camp a little. */
  turn(dx: number, dy: number) {
    if (this.inspecting) {
      this.inspector.turn(dx, dy);
      return;
    }
    this.yaw = THREE.MathUtils.clamp(this.yaw - dx, -0.75, 0.75);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.6, 0.55, 1.0);
  }

  beginReconstruction() {
    this.stop();
    this.world.reset();
    this.stage.before(this.world);
  }

  playEvent(id: string) {
    return this.play((tl) => this.stage.event(this.world, id, tl));
  }

  playExplanation(id: string) {
    return this.play((tl) => this.stage.explain(this.world, id, tl));
  }

  /** Point at the evidence that disagrees with the replay. */
  flag(clueId: string) {
    const at = this.stage.anchors[clueId];
    if (at) this.world.extras.add(pulseRing(at));
  }

  snapshot(): string | null {
    if (!this.renderer) return null;
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL("image/jpeg", 0.82);
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.width = Math.max(1, parent?.clientWidth ?? window.innerWidth);
    this.height = Math.max(1, parent?.clientHeight ?? window.innerHeight);
    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // Keep about twelve units of camp across the frame, however narrow the screen.
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(19)) * aspect);
    this.radius = Math.max(16.5, 6.2 / Math.tan(halfFov));
    this.lighting.fitFog(this.scene, this.radius);
    this.inspector.resize(aspect);
    this.renderer?.setSize(this.width, this.height, false);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.stop();
    this.renderer?.dispose();
  }

  private play(build: (tl: gsap.core.Timeline) => void): Promise<void> {
    this.stop();
    const tl = gsap.timeline({ paused: true });
    build(tl);
    this.running = tl;
    return new Promise((resolve) => {
      if (this.reducedMotion) {
        // Jump to the outcome, then hold it long enough to read.
        tl.progress(1);
        window.setTimeout(resolve, 650);
        return;
      }
      tl.eventCallback("onComplete", () => resolve());
      tl.play();
    });
  }

  private stop() {
    if (this.running) {
      this.running.eventCallback("onComplete", null);
      this.running.progress(1).kill();
      this.running = null;
    }
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();
    this.placeCamera();
    for (const c of this.world.extras.children) c.userData.update?.(dt);
    if (!this.reducedMotion) this.idle(t);
    this.inspector.update(dt, this.reducedMotion);
    if (this.renderer) {
      if (this.inspecting) this.renderer.render(this.inspector.scene, this.inspector.camera);
      else this.renderer.render(this.scene, this.camera);
    }
    this.emitAnchors();
    if (this.firstFrame) {
      const cb = this.firstFrame;
      this.firstFrame = null;
      cb();
    }
  };

  private placeCamera() {
    const r = this.radius;
    this.camera.position.set(
      TARGET.x + r * Math.sin(this.pitch) * Math.sin(this.yaw),
      TARGET.y + r * Math.cos(this.pitch),
      TARGET.z + r * Math.sin(this.pitch) * Math.cos(this.yaw),
    );
    this.camera.lookAt(TARGET);
  }

  private idle(t: number) {
    const cast = Object.entries(this.world.cast) as [CharacterId, Character][];
    cast.forEach(([id, c], i) => {
      c.body.rotation.z = Math.sin(t * 1.6 + i * 2) * 0.03;
      if (this.world.asleep.has(id)) return;
      const blink = (t + i * 1.3) % 4 < 0.12;
      for (const e of c.eyes) e.scale.y = blink ? 0.1 : 1;
    });
    const flame = this.world.fire.getObjectByName("flame");
    if (flame) flame.scale.set(1, 0.85 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7) * 0.08, 1);
  }

  private emitAnchors() {
    if (!this.listeners.length) return;
    const out: Anchor[] = [];
    const push = (id: string, p: THREE.Vector3) => {
      tmp.copy(p).project(this.camera);
      out.push({
        id,
        x: ((tmp.x + 1) / 2) * this.width,
        y: ((1 - tmp.y) / 2) * this.height,
        onScreen: tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05,
      });
    };
    for (const [id, p] of Object.entries(this.stage.anchors)) push(id, p);
    for (const [id, c] of Object.entries(this.world.cast) as [CharacterId, Character][]) {
      // The top of the silhouette, so the tag sits right whether a camper stands or lies down.
      box.setFromObject(c.root);
      push(id, box.getCenter(tmp2).setY(box.max.y + 0.1));
    }
    for (const l of this.listeners) l(out);
  }
}
