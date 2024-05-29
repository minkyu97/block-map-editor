import * as dat from "lil-gui";
import * as THREE from "three";
import { OrbitControls, TransformControls } from "three/examples/jsm/Addons.js";
import Action from "./utils/Action";
import ActionHistory from "./utils/ActionHistory";
import KeyMap, { Modifiers } from "./utils/KeyMap";
import { OrthographicView, PerspectiveView } from "./utils/View";

/**
 * SCENE
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);

/**
 * RENDERER
 */
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setScissorTest(true);
renderer.setClearColor(0x000000, 1);

/**
 * VIEWS
 */
const mainView = new PerspectiveView({ x: 0, y: 0.5, width: 1, height: 0.5 });
mainView.camera.position.z = 5;
mainView.camera.position.y = 2;

const zView = new OrthographicView({ x: 0, y: 0, width: 0.5, height: 0.5 }, { height: 5 });
zView.camera.position.z = 5;

const xView = new OrthographicView({ x: 0.5, y: 0, width: 0.5, height: 0.5 }, { height: 5 });
xView.camera.position.x = 5;
xView.camera.lookAt(0, 0, 0);

const views = [mainView, zView, xView];

for (const view of views) {
}

/**
 * CONTROLS
 */
const orbitControls = new OrbitControls(mainView.camera, renderer.domElement);
const transformControls = new TransformControls(mainView.camera, renderer.domElement);
// @ts-ignore
// for supporting the custom viewport
transformControls._getPointer = function (event) {
  return {
    x: mainView.pointer.position.x,
    y: mainView.pointer.position.y,
    button: event.button,
  };
}.bind(transformControls);
transformControls.setMode("translate");
transformControls.setTranslationSnap(1);
transformControls.addEventListener("dragging-changed", ({ value }) => {
  if (value) orbitControls.enabled = false;
  else orbitControls.enabled = true;
});

/**
 * LIGHT
 */
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

/**
 * AXES HELPER
 */
const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.y = 0.1;
scene.add(axesHelper);

/**
 * CAMERA HELPER
 */
const cameraHelper = new THREE.CameraHelper(mainView.camera);
scene.add(cameraHelper);

/**
 * GRID
 */
const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);
const gridElements: THREE.Object3D[] = [];
for (let i = -4.5; i < 5.5; i++) {
  for (let j = -4.5; j < 5.5; j++) {
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true }),
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.set(i, 0, j);
    grid.name = `grid-${i}-${j}`;
    gridElements.push(grid);
    scene.add(grid);
  }
}

/**
 * BLOCK
 */
const blockWhenClicked = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({
    color: 0xff0000,
    opacity: 0.5,
    transparent: true,
  }),
);
blockWhenClicked.position.set(0, 0.5, 0);
scene.add(blockWhenClicked);

/**
 * HISTORY
 */
const history = new ActionHistory();

/**
 * RAYCASTER & MOUSE
 */
const pointer = mainView.pointer;
pointer.registerAll(gridElements);

let clicked = false;
let rClicked = false;

window.addEventListener("mousemove", (event) => {
  const mouseX = event.clientX;
  const mouseY = window.innerHeight - event.clientY;
  for (const view of views) {
    if (mouseX < view.realViewport.x || mouseX > view.realViewport.x + view.realViewport.width) continue;
    if (mouseY < view.realViewport.y || mouseY > view.realViewport.y + view.realViewport.height) continue;
    view.onMouseMove(mouseX, mouseY);
  }
  clicked = false;
  rClicked = false;
});
window.addEventListener("mousedown", (event) => {
  if (event.button === 0) clicked = true;
  else if (event.button === 2) rClicked = true;
});

let selectedBlock: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | undefined;

function unselectBlock() {
  if (selectedBlock === undefined) return;
  selectedBlock.material.color.set(0x00ff00);
  selectedBlock = undefined;
  transformControls.detach();
  scene.remove(transformControls);
}

function selectBlock(block: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>) {
  block.material.color.set(0x0000ff);
  selectedBlock = block;
  transformControls.attach(block);
  scene.add(transformControls);
}

function handleClick() {
  const object = pointer.intersectObject()?.object;
  if (object && object.name.startsWith("block")) {
    if (selectedBlock === object) {
      unselectBlock();
      return;
    }
    if (selectedBlock) unselectBlock();
    selectBlock(object as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>);
  }
}

function handleRightClick() {
  const object = pointer.intersectObject()?.object;
  if (object && object.name.startsWith("block")) {
    history.do(
      new Action(
        () => {
          pointer.remove(object);
          object.removeFromParent();
        },
        () => {
          pointer.register(object);
          scene.add(object);
        },
      ),
    );
  }
}

window.addEventListener("mouseup", () => {
  if (clicked) handleClick();
  if (rClicked) handleRightClick();
  clicked = false;
  rClicked = false;
});

/**
 * KEYBOARD
 */

function handleSpacebar() {
  const newBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
  newBlock.position.copy(blockWhenClicked.position);
  newBlock.name = `block-${newBlock.uuid}`;

  history.do(
    new Action(
      () => {
        pointer.register(newBlock);
        scene.add(newBlock);
      },
      () => {
        pointer.remove(newBlock);
        newBlock.removeFromParent();
      },
    ),
  );
}

function shiftSelectedBlock(offset: THREE.Vector3) {
  if (selectedBlock === undefined) return;
  const prevPosition = selectedBlock.position.clone();
  const newPosition = selectedBlock.position.clone().add(offset);

  // check there is no block in the new position
  if (pointer.traceObjects.some((o) => o.position.equals(newPosition))) return;
  history.do(
    new Action(
      () => {
        selectedBlock!.position.copy(newPosition);
      },
      () => {
        selectedBlock!.position.copy(prevPosition);
      },
    ),
  );
}

const keyMap = KeyMap.getInstance();
keyMap.bind(Modifiers.NONE, "Space", handleSpacebar);
keyMap.bind(Modifiers.META, "KeyZ", () => history.undo());
keyMap.bind(Modifiers.META | Modifiers.SHIFT, "KeyZ", () => history.redo());
keyMap.bind(Modifiers.NONE, "ArrowUp", () => shiftSelectedBlock(new THREE.Vector3(0, 0, -1)));
keyMap.bind(Modifiers.NONE, "ArrowDown", () => shiftSelectedBlock(new THREE.Vector3(0, 0, 1)));
keyMap.bind(Modifiers.NONE, "ArrowLeft", () => shiftSelectedBlock(new THREE.Vector3(-1, 0, 0)));
keyMap.bind(Modifiers.NONE, "ArrowRight", () => shiftSelectedBlock(new THREE.Vector3(1, 0, 0)));
keyMap.bind(Modifiers.NONE, "Comma", () => shiftSelectedBlock(new THREE.Vector3(0, 1, 0)));

/**
 * ANIMATION
 */
requestAnimationFrame(function animate(time) {
  requestAnimationFrame(animate);

  const intersect = pointer.intersectObject();
  if (intersect) {
    blockWhenClicked.position.copy(intersect.object.position);
    if (intersect.object.name.startsWith("grid")) {
      blockWhenClicked.position.y += 0.5;
    }
    if (intersect.object.name.startsWith("block")) {
      blockWhenClicked.position.add(intersect.face!.normal);
    }
  }

  for (const view of views) {
    renderer.setViewport(
      view.viewport.x * window.innerWidth,
      view.viewport.y * window.innerHeight,
      view.viewport.width * window.innerWidth,
      view.viewport.height * window.innerHeight,
    );
    renderer.setScissor(
      view.viewport.x * window.innerWidth,
      view.viewport.y * window.innerHeight,
      view.viewport.width * window.innerWidth,
      view.viewport.height * window.innerHeight,
    );
    renderer.clearColor();
    renderer.render(scene, view.camera);
  }
});

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  for (const view of views) {
    view.onResize(width, height);
  }
});

/**
 * GUI
 */
const gui = new dat.GUI();
const helperFolder = gui.addFolder("Helpers");
helperFolder.add(cameraHelper, "visible").name("Camera");
helperFolder.add(axesHelper, "visible").name("Axes");
const helpText = document.getElementById("help")!;
helpText.style.display = "block";
const helpTextManager = {
  get visible() {
    return helpText.style.display === "block";
  },
  set visible(value) {
    helpText.style.display = value ? "block" : "none";
  },
};
helperFolder.add(helpTextManager, "visible").name("Help Text");
