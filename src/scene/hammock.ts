import * as THREE from "three";
import { C, mat, mesh } from "./palette";

/** Refill the existing buffers using TubeGeometry's arc-length and Frenet-frame sampling. */
function updateTube(geometry: THREE.TubeGeometry) {
  const { path, tubularSegments, radialSegments, radius } = geometry.parameters;
  path.updateArcLengths();
  const frames = path.computeFrenetFrames(tubularSegments, false);
  geometry.tangents = frames.tangents;
  geometry.normals = frames.normals;
  geometry.binormals = frames.binormals;
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    path.getPointAt(i / tubularSegments, point);
    const n = frames.normals[i] as THREE.Vector3;
    const b = frames.binormals[i] as THREE.Vector3;
    for (let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      normal
        .copy(n)
        .multiplyScalar(-Math.cos(angle))
        .addScaledVector(b, Math.sin(angle))
        .normalize();
      const index = i * (radialSegments + 1) + j;
      positions.setXYZ(
        index,
        point.x + radius * normal.x,
        point.y + radius * normal.y,
        point.z + radius * normal.z,
      );
      normals.setXYZ(index, normal.x, normal.y, normal.z);
    }
  }
  positions.needsUpdate = normals.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

/** A two-tube sling whose meshes, topology and GPU buffers survive a table lurch. */
export class Hammock extends THREE.Group {
  private readonly midpoint = new THREE.Vector3();
  private readonly ropeCurve = new THREE.QuadraticBezierCurve3();
  private readonly bedCurve = new THREE.QuadraticBezierCurve3();
  private readonly bed: THREE.Mesh<THREE.TubeGeometry>;
  private readonly rope: THREE.Mesh<THREE.TubeGeometry>;

  constructor(a: THREE.Vector3, b: THREE.Vector3, sag = 0.45) {
    super();
    this.curves(a, b, sag);
    this.bed = mesh(
      new THREE.TubeGeometry(this.bedCurve, 12, 0.2, 6, false),
      mat(C.canvas, { flat: true }),
    ) as THREE.Mesh<THREE.TubeGeometry>;
    this.rope = mesh(
      new THREE.TubeGeometry(this.ropeCurve, 16, 0.02, 4, false),
      mat(C.rope),
    ) as THREE.Mesh<THREE.TubeGeometry>;
    this.add(this.bed, this.rope);
    for (const geometry of [this.bed.geometry, this.rope.geometry]) {
      (geometry.getAttribute("position") as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      (geometry.getAttribute("normal") as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  }

  private curves(a: THREE.Vector3, b: THREE.Vector3, sag: number) {
    this.midpoint.copy(a).lerp(b, 0.5);
    this.midpoint.y -= sag;
    this.ropeCurve.v0.copy(a);
    this.ropeCurve.v1.copy(this.midpoint);
    this.ropeCurve.v2.copy(b);
    this.bedCurve.v0.copy(a).lerp(this.midpoint, 0.25);
    this.bedCurve.v1.copy(this.midpoint);
    this.bedCurve.v2.copy(b).lerp(this.midpoint, 0.25);
  }

  update(a: THREE.Vector3, b: THREE.Vector3, sag = 0.45) {
    this.curves(a, b, sag);
    updateTube(this.bed.geometry);
    updateTube(this.rope.geometry);
  }
}
