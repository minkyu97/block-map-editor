import * as dat from "lil-gui";
import * as THREE from "three";
import { OrbitControls, TransformControls } from "three/examples/jsm/Addons.js";
import { ActionHistory } from "./utils/ActionHistory";
import { KeyMap, Modifiers } from "./utils/KeyMap";
import { TracedObject } from "./utils/TracedObject";
import { OrthographicView, PerspectiveView } from "./view/View";
import { World } from "./world/World";

/**
 * SCENE & WORLD
 */
const scene = new THREE.Scene();
const world = new World(scene);
scene.background = new THREE.Color(0xaaaaaa);
const centerOfScene = new THREE.Vector3(-0.5, -0.5, -0.5);

/**
 * RENDERER
 */
const renderer = new THREE.WebGLRenderer();
const pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setScissorTest(true);
renderer.autoClear = false;
// renderer.setClearColor(0x000000, 1);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/**
 * VIEWS
 */
const mainView = new PerspectiveView(world, { x: 0, y: 0.5, width: 1, height: 0.5 });
mainView.position.set(0, 2, 5);
mainView.position.add(centerOfScene);
mainView.layers.enable(1);

const zView = new OrthographicView(world, { x: 0, y: 0, width: 0.5, height: 0.5 }, { height: 5 });
zView.position.copy(centerOfScene);
zView.position.z += 10;

const xView = new OrthographicView(world, { x: 0.5, y: 0, width: 0.5, height: 0.5 }, { height: 5 });
xView.position.copy(centerOfScene);
xView.position.x += 10;
xView.lookAt(centerOfScene);

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
world.add(transformControls);
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
world.add(light);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
world.add(ambientLight);

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
world.add(axesHelper);

/**
 * CAMERA HELPER
 */
const cameraHelper = new THREE.CameraHelper(mainView.camera);
world.add(cameraHelper);

/**
 * GRID
 */
const gridHelper = new THREE.GridHelper(10, 10);
gridHelper.position.copy(centerOfScene);
world.add(gridHelper);
const grid = new TracedObject(new THREE.Group());
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
grid.bind(world);

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
world.add(expectedBlock);

/**
 * HISTORY
 */
const history = new ActionHistory();

type BlockType = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
let selectedBlock: BlockType | undefined;

function unselectBlock() {
  if (selectedBlock === undefined) return;
  selectedBlock.material.color.set(0x00ff00);
  selectedBlock = undefined;
  transformControls.detach();
  transformControls.visible = false;
  expectedBlock.visible = true;
}

function selectBlock(block: BlockType) {
  block.material.color.set(0x0000ff);
  selectedBlock = block;
  transformControls.attach(block);
  transformControls.visible = true;
  expectedBlock.visible = false;
}

function handleClick(object: BlockType) {
  if (object && object.name.startsWith("block")) {
    if (selectedBlock === object) {
      unselectBlock();
      return;
    }
    if (selectedBlock) unselectBlock();
    selectBlock(object);
  }
}

function handleRightClick(object: TracedObject) {
  if (object && object.object.name.startsWith("block")) {
    history.do(
      () => {
        if (selectedBlock === object.object) {
          unselectBlock();
        }
        object.unbind();
        object.removeFromParent();
      },
      () => {
        object.bind(world);
      },
    );
  }
}

let pointerBeforeDrag: THREE.Vector2 | undefined;
mainView.addEventListener("pointermove", (e) => {
  if (e.buttons === 0) {
    pointerBeforeDrag = undefined;
    return;
  }
  pointerBeforeDrag = pointerBeforeDrag ?? new THREE.Vector2(e.x, e.y);
});

mainView.addEventListener("click", (e) => {
  const currentPointer = new THREE.Vector2(e.x, e.y);
  const previousPointer = pointerBeforeDrag ?? currentPointer;
  pointerBeforeDrag = undefined;
  if (previousPointer.distanceTo(currentPointer) > 0.01) return;
  const intersect = e.intersection;
  const target = e.currentTarget;
  if (intersect && e.button === 0) {
    handleClick(intersect.object as BlockType);
  }
  if (target && e.button === 2) {
    handleRightClick(target);
  }
});

/**
 * KEYBOARD
 */

function handleSpacebar() {
  if (!expectedBlock.visible) return;
  const newBlock = new TracedObject(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00 })),
  );
  newBlock.object.position.copy(expectedBlock.position);
  newBlock.object.name = `block-${newBlock.uuid}`;

  history.do(
    () => {
      newBlock.bind(world);
    },
    () => {
      if (selectedBlock === newBlock.object) {
        unselectBlock();
      }
      newBlock.unbind();
      newBlock.removeFromParent();
    },
  );
}

function shiftSelectedBlock(offset: THREE.Vector3) {
  if (selectedBlock === undefined) return;
  const prevPosition = selectedBlock.position.clone();
  const newPosition = selectedBlock.position.clone().add(offset);

  // check there is no block in the new position
  const overlap = world.tracedObjects.some((o) => {
    return o.object.position.equals(newPosition) && o.object.name.startsWith("block");
  });
  if (overlap) return;
  history.do(
    () => {
      selectedBlock!.position.copy(newPosition);
    },
    () => {
      selectedBlock!.position.copy(prevPosition);
    },
  );
}

const keyMap = new KeyMap();
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
  mainView.updateIntersections();
  const intersect = mainView.intersections[0];

  if (intersect) {
    expectedBlock.position.copy(intersect.object.position);
    if (intersect.object.name.startsWith("grid")) {
      expectedBlock.position.y += 0.5;
    }
    if (intersect.object.name.startsWith("block")) {
      expectedBlock.position.add(intersect.face!.normal);
    }
  }
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.clear();
  views.forEach((view) => {
    renderer.setViewport(view.realViewport.x, view.realViewport.y, view.realViewport.width, view.realViewport.height);
    renderer.setScissor(view.realViewport.x, view.realViewport.y, view.realViewport.width, view.realViewport.height);
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
