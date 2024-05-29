import * as THREE from "three";
import Pointer from "./Pointer";

type ViewPort = { x: number; y: number; width: number; height: number };

export interface View {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly pointer: Pointer;
  onResize(width: number, height: number): void;
  onMouseMove(mouseX: number, mouseY: number): void;
}

type PerspectiveCameraOptions = {
  fov?: number;
  near?: number;
  far?: number;
};

export class PerspectiveView implements View {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly pointer: Pointer;

  constructor(viewport: ViewPort, { fov = 75, near = 0.1, far = 1000 }: PerspectiveCameraOptions = {}) {
    this.scene = new THREE.Scene();
    this.viewport = viewport;
    this.realViewport = {
      x: viewport.x * window.innerWidth,
      y: viewport.y * window.innerHeight,
      width: viewport.width * window.innerWidth,
      height: viewport.height * window.innerHeight,
    };
    const aspect = this.realViewport.width / this.realViewport.height;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.pointer = new Pointer(this.camera);
  }

  onResize(width: number, height: number) {
    this.realViewport.x = this.viewport.x * width;
    this.realViewport.y = this.viewport.y * height;
    this.realViewport.width = this.viewport.width * width;
    this.realViewport.height = this.viewport.height * height;
    this.camera.aspect = this.realViewport.width / this.realViewport.height;
    this.camera.updateProjectionMatrix();
  }

  onMouseMove(mouseX: number, mouseY: number) {
    const { x, y, width, height } = this.realViewport;
    this.pointer.position.x = ((mouseX - x) / width) * 2 - 1;
    this.pointer.position.y = ((mouseY - y) / height) * 2 - 1;
  }
}

type OrthographicCameraOptions = {
  near?: number;
  far?: number;
  height?: number;
};

export class OrthographicView implements View {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  readonly viewport: ViewPort;
  readonly realViewport: ViewPort;
  readonly height: number;
  readonly pointer: Pointer;

  constructor(viewport: ViewPort, { near = 0.1, far = 1000, height = 2 }: OrthographicCameraOptions = {}) {
    this.scene = new THREE.Scene();
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
    this.pointer = new Pointer(this.camera);
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

  onMouseMove(mouseX: number, mouseY: number) {
    const { x, y, width, height } = this.realViewport;
    this.pointer.position.x = ((mouseX - x) / width) * 2 - 1;
    this.pointer.position.y = ((mouseY - y) / height) * 2 - 1;
  }
}
