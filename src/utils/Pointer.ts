import * as THREE from "three";
import TracedObject from "./TracedObject";

export type TPointerEventMap = {
  pointermove: TPointer & TPointerStatus;
  pointerup: TPointer & TPointerStatus;
  pointerdown: TPointer & TPointerStatus;
  click: TPointer & TPointerStatus;
};

export type TPointerEvent = TPointer & TPointerStatus & { type: keyof TPointerEventMap };
export type TPointer = { x: number; y: number };
export type TPointerStatus = {
  button: number;
  buttons: number;
  intersection?: THREE.Intersection;
  currentTarget?: TracedObject;
};
