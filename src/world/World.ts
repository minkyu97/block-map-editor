import { Intersection, Object3D, Raycaster, Scene } from "three";
import { TracedObject } from "../utils/TracedObject";

export class World {
  scene: Scene;
  readonly tracedObjects: TracedObject[];

  constructor(scene?: Scene) {
    this.scene = scene ?? new Scene();
    this.tracedObjects = [];
  }

  getIntersections(raycaster: Raycaster): Intersection<TracedObject>[] {
    return raycaster.intersectObjects(this.tracedObjects, true);
  }

  add(object: Object3D): void {
    this.scene.add(object);
  }

  trace(object: TracedObject): void {
    this.tracedObjects.push(object);
    this.scene.add(object);
  }

  removeTracedObject(object: TracedObject): void {
    const index = this.tracedObjects.indexOf(object);
    if (index !== -1) this.tracedObjects.splice(index, 1);
    object.removeFromParent();
  }
}
