import * as THREE from "three";
import { TPointerEventMap } from "./Pointer";
import { View } from "./View";

type TracedObjectEventMap = THREE.Object3DEventMap & TPointerEventMap;

export default class TracedObject<
  T extends THREE.Object3D = THREE.Object3D,
> extends THREE.Object3D<TracedObjectEventMap> {
  view?: View;
  object: T;

  get binded(): boolean {
    return this.view !== undefined;
  }

  constructor(object: T) {
    super();
    this.add(object);
    this.object = object;
  }

  bind(view: View): void {
    this.view = view;
    this.view.addTracedObject(this);
  }

  unbind(): void {
    if (this.view) this.view.removeTracedObject(this);
    this.view = undefined;
  }
}
