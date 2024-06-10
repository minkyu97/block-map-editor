import * as THREE from "three";
import { World } from "../world/World";
import { TPointerEventMap } from "./TPointer";

type TracedObjectEventMap = THREE.Object3DEventMap & TPointerEventMap;

export class TracedObject<T extends THREE.Object3D = THREE.Object3D> extends THREE.Object3D<TracedObjectEventMap> {
  world?: World;
  object: T;

  get binded(): boolean {
    return this.world !== undefined;
  }

  constructor(object: T) {
    super();
    this.add(object);
    this.object = object;
  }

  bind(world: World): void {
    this.world = world;
    this.world.trace(this);
  }

  unbind(): void {
    if (this.world) this.world.remove(this);
    this.world = undefined;
  }
}
