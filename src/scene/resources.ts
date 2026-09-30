import * as THREE from "three";

const sharedMaterials = new WeakSet<THREE.Material>();

/** Cached palette materials can belong to the camp and the turntable at once. */
export function sharedMaterial<T extends THREE.Material>(material: T): T {
  sharedMaterials.add(material);
  return material;
}

export interface SceneResources {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  textures: Set<THREE.Texture>;
  instances: Set<THREE.InstancedMesh>;
  shadows: Set<THREE.LightShadow>;
}

function texturesOf(material: THREE.Material) {
  return Object.values(material).filter(
    (value): value is THREE.Texture => value instanceof THREE.Texture,
  );
}

/** Snapshot ownership before temporary clones or case marks join a persistent tree. */
export function resourcesOf(root: THREE.Object3D | readonly THREE.Object3D[]): SceneResources {
  const resources: SceneResources = {
    geometries: new Set(),
    materials: new Set(),
    textures: new Set(),
    instances: new Set(),
    shadows: new Set(),
  };
  const roots = root instanceof THREE.Object3D ? [root] : root;
  for (const tree of roots) {
    tree.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        resources.geometries.add(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          resources.materials.add(material);
          for (const texture of texturesOf(material)) resources.textures.add(texture);
        }
      }
      if (object instanceof THREE.InstancedMesh) resources.instances.add(object);
      if (
        object instanceof THREE.DirectionalLight ||
        object instanceof THREE.SpotLight ||
        object instanceof THREE.PointLight
      ) {
        resources.shadows.add(object.shadow);
      }
    });
  }
  return resources;
}

/** Release owned GPU resources once, preserving resources borrowed by a clone. */
export function disposeTree(
  root: THREE.Object3D | readonly THREE.Object3D[],
  options: { preserve?: SceneResources; includeSharedMaterials?: boolean } = {},
) {
  const resources = resourcesOf(root);
  const keep = options.preserve;
  const retainedTextures = new Set(keep?.textures);
  for (const material of resources.materials) {
    if (
      keep?.materials.has(material) ||
      (!options.includeSharedMaterials && sharedMaterials.has(material))
    ) {
      for (const texture of texturesOf(material)) retainedTextures.add(texture);
      continue;
    }
    material.dispose();
  }
  for (const geometry of resources.geometries) {
    if (!keep?.geometries.has(geometry)) geometry.dispose();
  }
  for (const texture of resources.textures) {
    if (!retainedTextures.has(texture)) texture.dispose();
  }
  for (const instance of resources.instances) {
    if (!keep?.instances.has(instance)) instance.dispose();
  }
  for (const shadow of resources.shadows) {
    if (!keep?.shadows.has(shadow)) shadow.dispose();
  }
  const roots = root instanceof THREE.Object3D ? [root] : root;
  for (const tree of roots) tree.clear();
}
