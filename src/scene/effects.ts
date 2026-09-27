import * as THREE from "three";

// Ambient effects that tick every frame through `userData.update(dt)`.

export function rain(count = 500): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(0.012, 0.35, 0.012);
  const m = new THREE.MeshBasicMaterial({ color: 0xdbe7f2, transparent: true, opacity: 0.55 });
  const inst = new THREE.InstancedMesh(geo, m, count);
  inst.name = "rain";
  const drops = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 15,
    y: Math.random() * 9,
    z: (Math.random() - 0.5) * 15,
    s: 7 + Math.random() * 3,
  }));
  const tmp = new THREE.Object3D();
  const place = () => {
    drops.forEach((d, i) => {
      tmp.position.set(d.x, d.y, d.z);
      tmp.updateMatrix();
      inst.setMatrixAt(i, tmp.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
  };
  place();
  inst.frustumCulled = false;
  inst.userData.update = (dt: number) => {
    for (const d of drops) {
      d.y -= d.s * dt;
      if (d.y < 0) d.y += 9;
    }
    place();
  };
  return inst;
}

/** A ring on the ground that pulses to point at a piece of evidence. */
export function pulseRing(at: THREE.Vector3, color = 0xd94f3d): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.45, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(at.x, 0.03, at.z);
  let t = 0;
  ring.userData.update = (dt: number) => {
    t += dt;
    const s = 1 + (t % 1.2) * 0.8;
    ring.scale.setScalar(s);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - (t % 1.2) / 1.2);
  };
  return ring;
}
