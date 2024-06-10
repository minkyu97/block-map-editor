import {
  BaseEvent,
  Camera,
  EventDispatcher,
  Intersection,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { World } from "../world/World";
import { TPointer, TPointerEventMap } from "./TPointer";
import { TracedObject } from "./TracedObject";

type ViewPort = { x: number; y: number; width: number; height: number };

type ViewEventMap = {
  resize: { width: number; height: number };
} & TPointerEventMap;

export abstract class View extends EventDispatcher<ViewEventMap> {
  world: World;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly pointer: TPointer;
  readonly raycaster: Raycaster;
  intersections: Intersection<TracedObject>[];
  private lastDownObjects: Set<TracedObject>;
  abstract readonly camera: Camera;

  get position() {
    return this.camera.position;
  }

  get layers() {
    return this.camera.layers;
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
    if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + height) return;
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

type PerspectiveCameraOptions = {
  fov?: number;
  near?: number;
  far?: number;
};

export class PerspectiveView extends View {
  readonly camera: PerspectiveCamera;

  constructor(world: World, viewport: ViewPort, { fov = 75, near = 0.1, far = 1000 }: PerspectiveCameraOptions = {}) {
    super(world, viewport);
    const aspect = this.realViewport.width / this.realViewport.height;
    this.camera = new PerspectiveCamera(fov, aspect, near, far);
  }

  updateCameraAspect(): void {
    this.camera.aspect = this.realViewport.width / this.realViewport.height;
    this.camera.updateProjectionMatrix();
  }
}

type OrthographicCameraOptions = {
  near?: number;
  far?: number;
  height?: number;
};

export class OrthographicView extends View {
  readonly camera: OrthographicCamera;
  readonly height: number;

  constructor(
    world: World,
    viewport: ViewPort,
    { near = 0.1, far = 1000, height = 2 }: OrthographicCameraOptions = {},
  ) {
    super(world, viewport);
    this.height = height;
    const aspect = this.realViewport.width / this.realViewport.height;
    this.camera = new OrthographicCamera(-height * aspect, height * aspect, height, -height, near, far);
  }

  updateCameraAspect(): void {
    const aspect = this.realViewport.width / this.realViewport.height;
    this.camera.left = -this.height * aspect;
    this.camera.right = this.height * aspect;
    this.camera.top = this.height;
    this.camera.bottom = -this.height;
    this.camera.updateProjectionMatrix();
  }
}
