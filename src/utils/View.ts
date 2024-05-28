import * as THREE from "three";

type ViewPort = { x: number; y: number; width: number; height: number };

export interface View {
  readonly camera: THREE.Camera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  onResize(width: number, height: number): void;
}

type PerspectiveCameraOptions = {
  fov?: number;
  near?: number;
  far?: number;
};

export class PerspectiveView implements View {
  readonly camera: THREE.PerspectiveCamera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;

  constructor(
    viewport: ViewPort,
    { fov = 75, near = 0.1, far = 1000 }: PerspectiveCameraOptions = {}
  ) {
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

  onResize(width: number, height: number) {
    this.realViewport.x = this.viewport.x * width;
    this.realViewport.y = this.viewport.y * height;
    this.realViewport.width = this.viewport.width * width;
    this.realViewport.height = this.viewport.height * height;
    this.camera.aspect = this.realViewport.width / this.realViewport.height;
    this.camera.updateProjectionMatrix();
  }
}

type OrthographicCameraOptions = {
  near?: number;
  far?: number;
  height?: number;
};

export class OrthographicView implements View {
  readonly camera: THREE.OrthographicCamera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly height: number;

  constructor(
    viewport: ViewPort,
    { near = 0.1, far = 1000, height = 2 }: OrthographicCameraOptions = {}
  ) {
    this.viewport = viewport;
    this.realViewport = {
      x: viewport.x * window.innerWidth,
      y: viewport.y * window.innerHeight,
      width: viewport.width * window.innerWidth,
      height: viewport.height * window.innerHeight,
    };
    const aspect = this.realViewport.width / this.realViewport.height;
    this.height = height;
    this.camera = new THREE.OrthographicCamera(
      -height * aspect,
      height * aspect,
      height,
      -height,
      near,
      far
    );
  }

  onResize(width: number, height: number) {
    this.realViewport.x = this.viewport.x * width;
    this.realViewport.y = this.viewport.y * height;
    this.realViewport.width = this.viewport.width * width;
    this.realViewport.height = this.viewport.height * height;
    const aspect = this.realViewport.width / this.realViewport.height;
    this.camera.left = -this.height * aspect;
    this.camera.right = this.height * aspect;
    this.camera.updateProjectionMatrix();
  }
}
