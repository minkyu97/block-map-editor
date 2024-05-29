import * as THREE from "three";

export default class Pointer {
  readonly raycaster: THREE.Raycaster;
  readonly traceObjectMap: Map<string, THREE.Object3D>;
  readonly traceObjects: THREE.Object3D[];
  readonly position: THREE.Vector2;
  readonly camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.traceObjectMap = new Map();
    this.traceObjects = [];
    this.position = new THREE.Vector2();
  }

  register(object: THREE.Object3D) {
    const key = object.name || object.uuid;
    if (this.traceObjectMap.has(key)) return;
    const index = this.traceObjects.length;
    this.traceObjectMap.set(key, object);
    this.traceObjects.push(object);
  }

  registerAll(objects: THREE.Object3D[]) {
    objects.forEach((object) => {
      this.register(object);
    });
  }

  clear() {
    this.traceObjectMap.clear();
    this.traceObjects.splice(0);
  }

  remove<T extends number | string | THREE.Object3D>(target: T): THREE.Object3D | undefined {
    if (typeof target === "number") {
      const index = target;
      if (index < 0 || index >= this.traceObjects.length) return;
      const object = this.traceObjects[index]!;
      this.traceObjectMap.delete(object.name || object.uuid);
      this.traceObjects.splice(index, 1);
      return object;
    } else {
      const key = typeof target === "string" ? target : target.name || target.uuid;
      const object = this.traceObjectMap.get(key);
      if (object === undefined) return;
      this.traceObjectMap.delete(key);
      this.traceObjects.splice(this.traceObjects.indexOf(object), 1);
    }
  }

  removeAll<T extends number | string | THREE.Object3D>(targets: T[]): THREE.Object3D[] {
    if (targets.length === 0) {
      return [];
    }
    if (typeof targets[0] === "number") {
      return this.removeIndices(targets as number[]);
    } else {
      const keys =
        typeof targets[0] === "string"
          ? (targets as string[])
          : (targets as THREE.Object3D[]).map((o) => o.name || o.uuid);
      return this.removeKeys(keys);
    }
  }

  private removeIndices(indices: number[]): THREE.Object3D[] {
    const removed: THREE.Object3D[] = [];
    Array.from(new Set(indices))
      .sort()
      .reverse()
      .filter((index) => index >= 0 && index < this.traceObjects.length)
      .forEach((index) => {
        const object = this.traceObjects[index]!;
        this.traceObjectMap.delete(object.name || object.uuid);
        this.traceObjects.splice(index, 1);
        removed.push(object);
      });
    return removed;
  }

  private removeKeys(keys: string[]): THREE.Object3D[] {
    const removed: THREE.Object3D[] = [];
    keys.forEach((key) => {
      const object = this.traceObjectMap.get(key);
      if (object !== undefined) {
        this.traceObjectMap.delete(key);
        this.traceObjects.splice(this.traceObjects.indexOf(object), 1);
        removed.push(object);
      }
    });
    return removed;
  }

  removeLast(): THREE.Object3D | undefined {
    return this.remove(this.traceObjects.length - 1);
  }

  intersectObject(): THREE.Intersection | undefined {
    const intersects = this.intersectObjects();
    return intersects[0];
  }

  intersectObjects(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.position, this.camera);
    return this.raycaster.intersectObjects(this.traceObjects);
  }
}
