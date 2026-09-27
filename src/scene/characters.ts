import * as THREE from "three";
import type { CharacterId } from "../game/types";
import { C, group, mat, mesh } from "./palette";

// The recurring cast: chunky, readable silhouettes with a hat each, plus two imaginary suspects.

interface Look {
  body: number;
  skin: number;
  height: number;
  girth: number;
  hat: (g: THREE.Group, top: number) => void;
}

const LOOKS: Record<CharacterId, Look> = {
  gus: {
    body: 0x6b7f4e,
    skin: 0xe7b58f,
    height: 1.35,
    girth: 0.27,
    hat: (g, top) => {
      g.add(
        mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), mat(0xb68a4e), 0, top + 0.02, 0),
      );
      g.add(
        mesh(new THREE.ConeGeometry(0.18, 0.2, 4), mat(0xb68a4e, { flat: true }), 0, top + 0.12, 0),
      );
      g.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), mat(0x5e4630), 0, top - 0.2, 0.2));
    },
  },
  marge: {
    body: 0xc77ba0,
    skin: 0xc98f6b,
    height: 1.12,
    girth: 0.32,
    hat: (g, top) => {
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.03, 18), mat(0xf0d98a), 0, top, 0));
      g.add(
        mesh(
          new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          mat(0xf0d98a),
          0,
          top,
          0,
        ),
      );
      g.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 16), mat(C.check), 0, top + 0.03, 0));
    },
  },
  pip: {
    body: 0x4f8fb8,
    skin: 0xf0c8a4,
    height: 0.85,
    girth: 0.21,
    hat: (g, top) => {
      g.add(
        mesh(
          new THREE.SphereGeometry(0.19, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          mat(C.sock),
          0,
          top - 0.05,
          0,
        ),
      );
      const brim = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.18), mat(C.sock), 0, top - 0.05, 0.2);
      g.add(brim);
    },
  },
};

export interface Character {
  root: THREE.Group;
  body: THREE.Group;
  eyes: THREE.Mesh[];
  cape: THREE.Mesh;
  headTop: number;
}

export function character(id: CharacterId): Character {
  const look = LOOKS[id];
  const body = new THREE.Group();
  const h = look.height;
  const torso = mesh(
    new THREE.CapsuleGeometry(look.girth, h * 0.45, 4, 10),
    mat(look.body),
    0,
    h * 0.42,
    0,
  );
  const headR = 0.2 + look.girth * 0.25;
  const headY = h * 0.42 + h * 0.22 + look.girth + headR * 0.7;
  const head = mesh(new THREE.SphereGeometry(headR, 16, 12), mat(look.skin), 0, headY, 0);
  body.add(torso, head);
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const eye = mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      mat(C.ink),
      s * headR * 0.38,
      headY + 0.03,
      headR * 0.9,
    );
    eyes.push(eye);
    body.add(eye);
  }
  const hatGroup = new THREE.Group();
  look.hat(hatGroup, headY + headR * 0.75);
  body.add(hatGroup);
  const capeShape = new THREE.ConeGeometry(look.girth * 2.4, h * 1.05, 4, 1, true);
  const cape = mesh(capeShape, mat(C.tent, { flat: true }), 0, h * 0.55, 0);
  (cape.material as THREE.Material).side = THREE.DoubleSide;
  cape.rotation.y = Math.PI / 4;
  cape.visible = false;
  body.add(cape);
  const root = group(body);
  root.name = id;
  return { root, body, eyes, cape, headTop: headY + headR + 0.25 };
}

export function raccoon(): THREE.Group {
  const grey = mat(0x8b8a8f, { flat: true });
  const body = mesh(new THREE.SphereGeometry(0.28, 10, 8), grey, 0, 0.26, 0);
  body.scale.set(1, 0.8, 1.4);
  const head = mesh(new THREE.SphereGeometry(0.17, 10, 8), grey, 0, 0.38, 0.38);
  const mask = mesh(new THREE.BoxGeometry(0.3, 0.07, 0.1), mat(C.ink), 0, 0.41, 0.48);
  const tail = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    tail.add(
      mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8),
        mat(i % 2 ? C.ink : 0xb5b3b8),
        0,
        0,
        -i * 0.12,
      ),
    );
    (tail.children[i] as THREE.Mesh).rotation.x = Math.PI / 2;
  }
  tail.position.set(0, 0.35, -0.42);
  tail.rotation.x = -0.5;
  return group(body, head, mask, tail);
}

export function bear(): THREE.Group {
  const brown = mat(0x7a5236, { flat: true });
  const body = mesh(new THREE.SphereGeometry(0.6, 10, 8), brown, 0, 0.62, 0);
  body.scale.set(1, 0.9, 1.3);
  const head = mesh(new THREE.SphereGeometry(0.34, 10, 8), brown, 0, 0.95, 0.75);
  const snout = mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0xc49a72), 0, 0.88, 1.05);
  const g = group(body, head, snout);
  for (const s of [-1, 1])
    g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), brown, s * 0.22, 1.25, 0.72));
  return g;
}
