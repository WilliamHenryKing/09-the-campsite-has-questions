import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { Hammock } from "../src/scene/hammock";
import { disposeTree } from "../src/scene/resources";

const tubes = (sling: Hammock) =>
  sling.children.map((child) => (child as THREE.Mesh<THREE.TubeGeometry>).geometry);

/** The authored shape before the in-place updater: two independently sampled tubes. */
function original(a: THREE.Vector3, b: THREE.Vector3, sag: number) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y -= sag;
  const bed = new THREE.QuadraticBezierCurve3(
    a.clone().lerp(mid, 0.25),
    mid,
    b.clone().lerp(mid, 0.25),
  );
  const rope = new THREE.QuadraticBezierCurve3(a, mid, b);
  return [
    new THREE.TubeGeometry(bed, 12, 0.2, 6, false),
    new THREE.TubeGeometry(rope, 16, 0.02, 4, false),
  ];
}
function attributeError(a: THREE.BufferAttribute, b: THREE.BufferAttribute) {
  expect(a.count).toBe(b.count);
  let maximum = 0;
  for (let i = 0; i < a.array.length; i++)
    maximum = Math.max(maximum, Math.abs((a.array[i] ?? 0) - (b.array[i] ?? 0)));
  return maximum;
}
function ringCenter(geometry: THREE.TubeGeometry, ring: number) {
  const point = new THREE.Vector3();
  const positions = geometry.getAttribute("position");
  const radial = geometry.parameters.radialSegments;
  for (let i = 0; i < radial; i++)
    point.add(new THREE.Vector3().fromBufferAttribute(positions, ring * (radial + 1) + i));
  return point.multiplyScalar(1 / radial);
}

describe("the reusable hammock sling", () => {
  test("120 lurch updates retain both meshes, geometries, attributes, arrays and topology", () => {
    const a = new THREE.Vector3(0, 0.5, 0.4);
    const b = new THREE.Vector3(3.72, 1.05, 0.6);
    const sling = new Hammock(a, b, 0.35);
    const children = [...sling.children];
    const geometries = tubes(sling);
    const before = geometries.map((geometry) => ({
      position: geometry.getAttribute("position"),
      positions: geometry.getAttribute("position").array,
      normal: geometry.getAttribute("normal"),
      normals: geometry.getAttribute("normal").array,
      uv: geometry.getAttribute("uv"),
      index: geometry.index,
    }));
    let disposed = 0;
    for (const geometry of geometries) geometry.addEventListener("dispose", () => disposed++);
    for (let frame = 0; frame < 120; frame++) {
      const t = frame / 119;
      a.set(0.45 + t * 0.9, 0.5, 0.4 + t * 0.1);
      sling.update(a, b, 0.35);
    }
    expect(sling.children).toEqual(children);
    expect(tubes(sling)).toEqual(geometries);
    geometries.forEach((geometry, i) => {
      const saved = before[i];
      if (!saved) throw new Error("saved tube attributes");
      expect(geometry.getAttribute("position")).toBe(saved.position);
      expect(geometry.getAttribute("position").array).toBe(saved.positions);
      expect(geometry.getAttribute("normal")).toBe(saved.normal);
      expect(geometry.getAttribute("normal").array).toBe(saved.normals);
      expect(geometry.getAttribute("uv")).toBe(saved.uv);
      expect(geometry.index).toBe(saved.index);
      expect((saved.position as THREE.BufferAttribute).usage).toBe(THREE.DynamicDrawUsage);
      expect((saved.normal as THREE.BufferAttribute).usage).toBe(THREE.DynamicDrawUsage);
      expect((saved.position as THREE.BufferAttribute).version).toBe(120);
      expect((saved.normal as THREE.BufferAttribute).version).toBe(120);
    });
    expect(disposed).toBe(0);
    disposeTree(sling);
    expect(disposed).toBe(2);
  });

  test("updated positions and normals match fresh authored tubes across direction, height and sag", () => {
    const sling = new Hammock(new THREE.Vector3(0, 1, 0), new THREE.Vector3(3, 1, 0));
    const poses: [THREE.Vector3, THREE.Vector3, number][] = [
      [new THREE.Vector3(0, 0.5, 0.4), new THREE.Vector3(3.72, 1.05, 0.6), 0.35],
      [new THREE.Vector3(1.2, 0.5, 0.5), new THREE.Vector3(3.72, 1.05, 0.6), 0.35],
      [new THREE.Vector3(-2, 1.2, 2), new THREE.Vector3(1, 0.8, -3), 0.75],
      [new THREE.Vector3(3, 2, -1), new THREE.Vector3(-1, 1.5, 2), 0],
    ];
    for (const [a, b, sag] of poses) {
      sling.update(a, b, sag);
      const reference = original(a, b, sag);
      tubes(sling).forEach((geometry, i) => {
        const expected = reference[i];
        if (!expected) throw new Error("reference tube");
        for (const name of ["position", "normal"]) {
          expect(
            attributeError(
              geometry.getAttribute(name) as THREE.BufferAttribute,
              expected.getAttribute(name) as THREE.BufferAttribute,
            ),
          ).toBeLessThan(1e-6);
        }
        expect(geometry.index?.array).toEqual(expected.index?.array);
        expect(geometry.getAttribute("uv").array).toEqual(expected.getAttribute("uv").array);
        expected.dispose();
      });
    }
    disposeTree(sling);
  });

  test("rope rings stay attached to endpoints and the bed keeps its inset ends and sag", () => {
    const a = new THREE.Vector3(-1, 0.7, 0.3);
    const b = new THREE.Vector3(3.72, 1.05, 0.6);
    const sling = new Hammock(a, b);
    sling.update(a, b, 0.6);
    const [bed, rope] = tubes(sling);
    if (!bed || !rope) throw new Error("bed and rope");
    const middle = a.clone().lerp(b, 0.5);
    middle.y -= 0.6;
    expect(ringCenter(rope, 0).distanceTo(a)).toBeLessThan(1e-6);
    expect(ringCenter(rope, 16).distanceTo(b)).toBeLessThan(1e-6);
    expect(ringCenter(bed, 0).distanceTo(a.clone().lerp(middle, 0.25))).toBeLessThan(1e-6);
    expect(ringCenter(bed, 12).distanceTo(b.clone().lerp(middle, 0.25))).toBeLessThan(1e-6);
    // Sag is the quadratic control-point offset, not the curve's midpoint displacement.
    const expectedMiddle = rope.parameters.path.getPointAt(0.5);
    expect(ringCenter(rope, 8).distanceTo(expectedMiddle)).toBeLessThan(1e-6);
    expect(expectedMiddle.y).toBeLessThan((a.y + b.y) / 2);
    disposeTree(sling);
  });

  test("large endpoint changes refresh finite bounds and unit normals without replacing the bounds", () => {
    const sling = new Hammock(new THREE.Vector3(0, 1, 0), new THREE.Vector3(3, 1, 0));
    const bounds = tubes(sling).map((geometry) => ({
      box: geometry.boundingBox,
      sphere: geometry.boundingSphere,
    }));
    sling.update(new THREE.Vector3(20, 4, -15), new THREE.Vector3(25, 2, -12), 0.8);
    tubes(sling).forEach((geometry, i) => {
      const box = geometry.boundingBox;
      const sphere = geometry.boundingSphere;
      const saved = bounds[i];
      if (!box || !sphere || !saved?.box || !saved.sphere) throw new Error("updated bounds");
      expect(box).toBe(saved.box);
      expect(sphere).toBe(saved.sphere);
      expect(box.min.x).toBeGreaterThan(19);
      const position = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      const point = new THREE.Vector3();
      let maximumNormalError = 0;
      let outside = 0;
      for (let vertex = 0; vertex < position.count; vertex++) {
        point.fromBufferAttribute(position, vertex);
        if (!box.containsPoint(point) || point.distanceTo(sphere.center) > sphere.radius + 1e-7)
          outside++;
        expect(point.toArray().every(Number.isFinite)).toBe(true);
        maximumNormalError = Math.max(
          maximumNormalError,
          Math.abs(point.fromBufferAttribute(normal, vertex).length() - 1),
        );
      }
      expect(outside).toBe(0);
      expect(maximumNormalError).toBeLessThan(1e-6);
    });
    disposeTree(sling);
  });
});
