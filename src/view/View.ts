import { BaseEvent, Camera, EventDispatcher, Intersection, Raycaster, Vector2, Vector3 } from "three";
import { TPointer, TPointerEventMap } from "../lib/TPointer";
import { TracedObject } from "../lib/TracedObject";
import { World } from "../world/World";

export type ViewPort = { x: number; y: number; width: number; height: number };

type ViewEventMap = {
  resize: { width: number; height: number };
} & TPointerEventMap;

export abstract class View extends EventDispatcher<ViewEventMap> {
  world: World;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly pointer: TPointer;
  readonly raycaster: Raycaster;
  private intersections: Intersection<TracedObject>[];
  private lastDownObjects: Set<TracedObject>;
  abstract readonly camera: Camera;

  get position() {
    return this.camera.position;
  }

  get layers() {
    return this.camera.layers;
  }

  get intersection() {
    return this.intersections[0];
  }

  constructor(world: World, viewport: ViewPort) {
    super();
    this.world = world;
    this.viewport = viewport;
    this.realViewport = {
      x: viewport.x * window.innerWidth,
      y: viewport.y * window.innerHeight,
      width: viewport.width * window.innerWidth,
      height: viewport.height * window.innerHeight,
    };
    this.pointer = { x: 0, y: 0 };
    this.raycaster = new Raycaster();
    this.intersections = [];
    this.lastDownObjects = new Set();

    window.addEventListener("resize", () => {
      this.onResize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener("pointermove", (e) => {
      if (!this.checkEventInViewport(e)) return;
      this.onMouseMove(e);
    });
    window.addEventListener("pointerup", (e) => {
      if (!this.checkEventInViewport(e)) return;
      this.onMouseUp(e);
    });
    window.addEventListener("pointerdown", (e) => {
      if (!this.checkEventInViewport(e)) return;
      this.onMouseDown(e);
    });
  }

  abstract updateCameraAspect(): void;

  updateIntersections() {
    this.updateRaycaster();
    this.intersections = this.world.getIntersections(this.raycaster);
  }

  lookAt(target: Vector3) {
    this.camera.lookAt(target);
  }

  private onResize(width: number, height: number) {
    this.realViewport.x = this.viewport.x * width;
    this.realViewport.y = this.viewport.y * height;
    this.realViewport.width = this.viewport.width * width;
    this.realViewport.height = this.viewport.height * height;
    this.updateCameraAspect();
    this.dispatchEvent({ type: "resize", width, height });
  }

  private onMouseMove(e: PointerEvent) {
    const mouseX = e.clientX;
    const mouseY = window.innerHeight - e.clientY;
    const { x, y, width, height } = this.realViewport;
    this.pointer.x = ((mouseX - x) / width) * 2 - 1;
    this.pointer.y = ((mouseY - y) / height) * 2 - 1;
    const intersections = this.intersections;
    const moveEvent = this.makePointerEvent("pointermove", e, intersections[0]);
    intersections.forEach((intersection) => {
      const object = intersection.object;
      object.dispatchEvent(moveEvent);
    });
    this.dispatchEvent(moveEvent);
  }

  private onMouseUp(e: PointerEvent) {
    const intersections = this.intersections;
    const upEvent = this.makePointerEvent("pointerup", e, intersections[0]);
    intersections.forEach((intersection) => {
      const object = intersection.object;
      object.dispatchEvent(upEvent);
    });
    this.dispatchEvent(upEvent);
    this.onMouseClick(e);
  }

  private onMouseDown(e: PointerEvent) {
    const intersections = this.intersections;
    const downEvent = this.makePointerEvent("pointerdown", e, intersections[0]);
    intersections.forEach((intersection) => {
      const object = intersection.object;
      object.dispatchEvent(downEvent);
    });
    this.lastDownObjects = new Set(intersections.map((intersection) => intersection.object));
    this.dispatchEvent(downEvent);
  }

  private onMouseClick(e: PointerEvent) {
    const intersections = this.intersections;
    const clickedObjects = intersections
      .map((intersection) => intersection.object)
      .filter((object) => this.lastDownObjects.has(object));
    const clickEvent = this.makePointerEvent("click", e, intersections[0]);
    clickedObjects.forEach((object) => object.dispatchEvent(clickEvent));
    this.dispatchEvent(clickEvent);
  }

  private makePointerEvent<T extends keyof TPointerEventMap>(
    type: T,
    e: PointerEvent,
    intersection?: Intersection,
  ): BaseEvent<T> & TPointerEventMap[T] {
    return {
      type,
      ...this.pointer,
      button: e.button,
      buttons: e.buttons,
      intersection,
      currentTarget: intersection?.object.parent as TracedObject | undefined,
    };
  }

  private checkEventInViewport(e: PointerEvent): boolean {
    const mouseX = e.clientX;
    const mouseY = window.innerHeight - e.clientY;
    const { x, y, width, height } = this.realViewport;
    return mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;
  }

  private updateRaycaster(): void {
    const pointer = new Vector2(this.pointer.x, this.pointer.y);
    this.raycaster.setFromCamera(pointer, this.camera);
  }
}
