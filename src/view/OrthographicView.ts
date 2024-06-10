import { OrthographicCamera } from "three";
import { World } from "../world/World";
import { View, ViewPort } from "./View";

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
