import * as THREE from "three";

type ViewPort = { x: number; y: number; width: number; height: number };

type ViewEventMap = {
  resize: { width: number; height: number };
  pointermove: { pointer: THREE.Vector2 };
};

export abstract class View extends THREE.EventDispatcher<ViewEventMap> {
  readonly pointer: THREE.Vector2;
  abstract readonly camera: THREE.Camera;
  abstract readonly viewport: ViewPort;
  abstract readonly realViewport: ViewPort;

  constructor() {
    super();
    this.pointer = new THREE.Vector2();
    window.addEventListener("resize", () => {
      this.onResize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener("pointermove", (e) => {
      this.onMouseMove(e.clientX, window.innerHeight - e.clientY);
    });
  }

  abstract updateCameraAspect(): void;

  private onResize(width: number, height: number) {
    this.realViewport.x = this.viewport.x * width;
    this.realViewport.y = this.viewport.y * height;
    this.realViewport.width = this.viewport.width * width;
    this.realViewport.height = this.viewport.height * height;
    this.updateCameraAspect();
    this.dispatchEvent({ type: "resize", width, height });
  }

  private onMouseMove(mouseX: number, mouseY: number) {
    const { x, y, width, height } = this.realViewport;
    this.pointer.set(((mouseX - x) / width) * 2 - 1, ((mouseY - y) / height) * 2 - 1);
    this.dispatchEvent({ type: "pointermove", pointer: this.pointer });
  }
}

type PerspectiveCameraOptions = {
  fov?: number;
  near?: number;
  far?: number;
};

export class PerspectiveView extends View {
  readonly camera: THREE.PerspectiveCamera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;

  constructor(viewport: ViewPort, { fov = 75, near = 0.1, far = 1000 }: PerspectiveCameraOptions = {}) {
    super();
    this.viewport = viewport;
    this.realViewport = {
      x: viewport.x * window.innerWidth,
      y: viewport.y * window.innerHeight,
      width: viewport.width * window.innerWidth,
      height: viewport.height * window.innerHeight,
    };
    const aspect = this.realViewport.width / this.realViewport.height;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
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
  readonly camera: THREE.OrthographicCamera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly height: number;

  constructor(viewport: ViewPort, { near = 0.1, far = 1000, height = 2 }: OrthographicCameraOptions = {}) {
    super();
    this.viewport = viewport;
    this.realViewport = {
      x: viewport.x * window.innerWidth,
      y: viewport.y * window.innerHeight,
      width: viewport.width * window.innerWidth,
      height: viewport.height * window.innerHeight,
    };
    const aspect = this.realViewport.width / this.realViewport.height;
    this.height = height;
    this.camera = new THREE.OrthographicCamera(-height * aspect, height * aspect, height, -height, near, far);
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
