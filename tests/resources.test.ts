import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { Inspector } from "../src/scene/inspector";
import { C, mat } from "../src/scene/palette";
import { disposeTree, resourcesOf, sharedMaterial } from "../src/scene/resources";
import { World } from "../src/scene/world";

describe("scene resource ownership", () => {
  test("reset releases case resources without disposing a borrowed tent or palette material", () => {
    const world = new World();
    const source = world.tent.children[0] as THREE.Mesh;
    let borrowedDisposals = 0;
    source.geometry.addEventListener("dispose", () => borrowedDisposals++);
    world.extras.add(world.tent.clone());

    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const counts = { geometry: 0, material: 0, texture: 0, instance: 0, palette: 0 };
    geometry.addEventListener("dispose", () => counts.geometry++);
    material.addEventListener("dispose", () => counts.material++);
    texture.addEventListener("dispose", () => counts.texture++);
    const instances = new THREE.InstancedMesh(geometry, material, 3);
    instances.addEventListener("dispose", () => counts.instance++);
    const palette = mat(C.groove);
    palette.addEventListener("dispose", () => counts.palette++);
    world.extras.add(
      instances,
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, palette),
    );

    world.reset();
    expect(world.extras.children).toHaveLength(0);
    expect(borrowedDisposals).toBe(0);
    expect(counts).toEqual({ geometry: 1, material: 1, texture: 1, instance: 1, palette: 0 });
    disposeTree(world.root);
  });

  test("changing evidence releases every old sample geometry and its owned glass material", () => {
    const inspector = new Inspector();
    inspector.show("drips");
    const old = resourcesOf(inspector.scene);
    let geometries = 0;
    for (const geometry of old.geometries) geometry.addEventListener("dispose", () => geometries++);
    const glass = [...old.materials].find(
      (material) => material instanceof THREE.MeshStandardMaterial && material.transparent,
    );
    let glassDisposals = 0;
    glass?.addEventListener("dispose", () => glassDisposals++);
    expect(glass).toBeDefined();

    inspector.show("book");
    expect(geometries).toBe(old.geometries.size);
    expect(glassDisposals).toBe(1);
    disposeTree(inspector.scene);
  });

  test("a replaced hammock releases geometry while keeping its cached rope material alive", () => {
    const world = new World();
    const a = new THREE.Vector3(0, 1, 0);
    const b = new THREE.Vector3(3, 1, 0);
    world.setHammock(a, b);
    const old = resourcesOf(world.hammock as THREE.Group);
    let geometries = 0;
    let materials = 0;
    for (const geometry of old.geometries) geometry.addEventListener("dispose", () => geometries++);
    for (const material of old.materials) material.addEventListener("dispose", () => materials++);
    world.setHammock(a, b.clone().addScalar(0.5));
    expect(geometries).toBe(old.geometries.size);
    expect(materials).toBe(0);
    disposeTree(world.root);
  });

  test("full teardown deduplicates shared resources across scenes and releases shadow maps", () => {
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = sharedMaterial(new THREE.MeshStandardMaterial({ map: texture }));
    const scene = new THREE.Scene();
    const second = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    second.add(new THREE.Mesh(geometry, material));
    const light = new THREE.DirectionalLight();
    const shadow = new THREE.WebGLRenderTarget(16, 16);
    light.shadow.map = shadow;
    scene.add(light);
    const counts = { geometry: 0, material: 0, texture: 0, shadow: 0 };
    geometry.addEventListener("dispose", () => counts.geometry++);
    material.addEventListener("dispose", () => counts.material++);
    texture.addEventListener("dispose", () => counts.texture++);
    shadow.addEventListener("dispose", () => counts.shadow++);

    disposeTree([scene, second], { includeSharedMaterials: true });
    expect(counts).toEqual({ geometry: 1, material: 1, texture: 1, shadow: 1 });
    expect(scene.children).toHaveLength(0);
    expect(second.children).toHaveLength(0);
  });
});
