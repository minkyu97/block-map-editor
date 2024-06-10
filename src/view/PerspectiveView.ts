import { PerspectiveCamera } from "three";
import { World } from "../world/World";
import { View, ViewPort } from "./View";

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
