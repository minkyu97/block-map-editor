import * as dat from "lil-gui";
import * as THREE from "three";
import { OrbitControls, TransformControls } from "three/examples/jsm/Addons.js";
import { Action, ActionHistory } from "./utils/ActionHistory";
import KeyMap, { Modifiers } from "./utils/KeyMap";
import { OrthographicView, PerspectiveView } from "./utils/View";

/**
 * SCENE
 */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);
const centerOfScene = new THREE.Vector3(-0.5, -0.5, -0.5);

/**
 * RENDERER
 */
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setScissorTest(true);
renderer.setClearColor(0x000000, 1);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/**
 * VIEWS
 */
const mainView = new PerspectiveView({ x: 0, y: 0.5, width: 1, height: 0.5 });
mainView.camera.position.set(0, 2, 5);
mainView.camera.position.add(centerOfScene);
mainView.camera.layers.enable(1);

const zView = new OrthographicView({ x: 0, y: 0, width: 0.5, height: 0.5 }, { height: 5 });
zView.camera.position.copy(centerOfScene);
zView.camera.position.z += 10;

const xView = new OrthographicView({ x: 0.5, y: 0, width: 0.5, height: 0.5 }, { height: 5 });
xView.camera.position.copy(centerOfScene);
xView.camera.position.x += 10;
xView.camera.lookAt(centerOfScene);

const views = [mainView, zView, xView];

/**
 * CONTROLS
 */
const orbitControls = new OrbitControls(mainView.camera, renderer.domElement);
orbitControls.target.copy(centerOfScene);
orbitControls.update();
const transformControls = new TransformControls(mainView.camera, renderer.domElement);
transformControls.getRaycaster().layers.set(1);
transformControls.traverse((child) => child.layers.set(1));
scene.add(transformControls);
// @ts-ignore
// for supporting the custom viewport
transformControls._getPointer = function (event) {
  return {
    ...mainView.pointer,
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
const axesHelper = new THREE.Group();
const axes = [
  new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 10), new THREE.MeshBasicMaterial({ color: 0x0000ff })),
  new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 10), new THREE.MeshBasicMaterial({ color: 0x00ff00 })),
  new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 10), new THREE.MeshBasicMaterial({ color: 0xff0000 })),
];
axes.forEach((axis, index) => {
  axis.position.copy(centerOfScene);
  axis.position.add(new THREE.Vector3(index === 2 ? 2.5 : 0, index === 1 ? 2.5 : 0, index === 0 ? 2.5 : 0));
  axis.quaternion.setFromAxisAngle(
    new THREE.Vector3(index === 0 ? 1 : 0, index === 1 ? 1 : 0, index === 2 ? 1 : 0),
    Math.PI / 2,
  );
  axesHelper.add(axis);
});
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
gridHelper.position.copy(centerOfScene);
scene.add(gridHelper);
const grid = new THREE.Group();
for (let i = -4.5; i < 5.5; i++) {
  for (let j = -4.5; j < 5.5; j++) {
    const gridElement = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true }),
    );
    gridElement.rotation.x = -Math.PI / 2;
    gridElement.position.set(i, 0, j);
    gridElement.position.add(centerOfScene);
    gridElement.name = `grid-${i}-${j}`;
    grid.add(gridElement);
  }
}
scene.add(grid);

/**
 * BLOCK
 */
const expectedBlock = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({
    color: 0xff0000,
    opacity: 0.5,
    transparent: true,
  }),
);
expectedBlock.position.set(0, 0.5, 0);
scene.add(expectedBlock);

/**
 * HISTORY
 */
const history = new ActionHistory();

/**
 * RAYCASTER & MOUSE
 */
const raycaster = new THREE.Raycaster();
const pointer = mainView.pointer;
const tracedObjects: THREE.Object3D[] = [grid];

let drag = false;
window.addEventListener("pointermove", (event) => {
  drag = event.buttons === 1;
});

let selectedBlock: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | undefined;

function unselectBlock() {
  if (selectedBlock === undefined) return;
  selectedBlock.material.color.set(0x00ff00);
  selectedBlock = undefined;
  transformControls.detach();
  transformControls.visible = false;
  expectedBlock.visible = true;
}

function selectBlock(block: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>) {
  block.material.color.set(0x0000ff);
  selectedBlock = block;
  transformControls.attach(block);
  transformControls.visible = true;
  expectedBlock.visible = false;
}

function handleClick() {
  const object = raycaster.intersectObjects(tracedObjects)[0]?.object;
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
  const object = raycaster.intersectObjects(tracedObjects)[0]?.object;
  if (object && object.name.startsWith("block")) {
    history.do(
      new Action(
        () => {
          if (selectedBlock === object) {
            unselectBlock();
          }
          tracedObjects.splice(tracedObjects.indexOf(object), 1);
          object.removeFromParent();
        },
        () => {
          tracedObjects.push(object);
          scene.add(object);
        },
      ),
    );
  }
}

window.addEventListener("pointerup", (e) => {
  if (!drag) {
    // non-dragging click
    if (e.button === 0) handleClick();
    if (e.button === 2) handleRightClick();
  } else {
    // dragging end
    drag = false;
  }
});

/**
 * KEYBOARD
 */

function handleSpacebar() {
  if (!expectedBlock.visible) return;
  const newBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
  newBlock.position.copy(expectedBlock.position);
  newBlock.name = `block-${newBlock.uuid}`;

  history.do(
    new Action(
      () => {
        tracedObjects.push(newBlock);
        scene.add(newBlock);
      },
      () => {
        if (selectedBlock === newBlock) {
          unselectBlock();
        }
        tracedObjects.pop();
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
  if (tracedObjects.some((o) => o.position.equals(newPosition))) return;
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
keyMap.bind(Modifiers.NONE, "Period", () => shiftSelectedBlock(new THREE.Vector3(0, -1, 0)));

/**
 * ANIMATION
 */
requestAnimationFrame(function animate(time) {
  requestAnimationFrame(animate);

  raycaster.setFromCamera(pointer, mainView.camera);
  const intersect = raycaster.intersectObjects(tracedObjects)[0];
  if (intersect) {
    expectedBlock.position.copy(intersect.object.position);
    if (intersect.object.name.startsWith("grid")) {
      expectedBlock.position.y += 0.5;
    }
    if (intersect.object.name.startsWith("block")) {
      expectedBlock.position.add(intersect.face!.normal);
    }
  }

  views.forEach((view, index) => {
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
  });
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
