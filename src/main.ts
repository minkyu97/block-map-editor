import * as THREE from "three";
import { OrbitControls, TransformControls } from "three/examples/jsm/Addons.js";
import { ActionHistory } from "./utils/ActionHistory";
import { KeyMap, Modifiers } from "./utils/KeyMap";
import { TracedObject } from "./utils/TracedObject";
import * as dat from "./utils/gui";
import { resizeImage } from "./utils/imageUtils";
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
const sunLight = new THREE.DirectionalLight(0xffffff, 1);
sunLight.position.set(13, 10, 0).add(centerOfScene);
sunLight.lookAt(centerOfScene);
sunLight.target.position.copy(centerOfScene);
world.add(sunLight);
world.add(sunLight.target);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
world.add(ambientLight);

/**
 * SUN LIGHT HELPER
 */
const sunLightHelper = new THREE.DirectionalLightHelper(sunLight, 1, 0xffff00);
world.add(sunLightHelper);

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
 * HISTORY
 */
const history = new ActionHistory();

/**
 * LOADERS
 */
const textureLoader = new THREE.TextureLoader();
const imageLoader = new THREE.ImageLoader();

/**
 * BLOCK
 */
type BlockType = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
const defaultBlockTextureUrl = new URL(
  "/assets/textures/Stylized_Bricks_004/Stylized_Bricks_004_basecolor.png",
  import.meta.url,
).toString();
const blockTexture = textureLoader.load(defaultBlockTextureUrl);
const blockMaterial = new THREE.MeshStandardMaterial({ map: blockTexture });
let selectedBlock: BlockType | undefined;
const expectedBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMaterial.clone());
expectedBlock.material.transparent = true;
expectedBlock.material.opacity = 0.5;
expectedBlock.position.set(0, 0.5, 0);
world.add(expectedBlock);

function unselectBlock() {
  if (selectedBlock === undefined) return;
  selectedBlock = undefined;
  transformControls.detach();
  transformControls.visible = false;
  expectedBlock.visible = true;

  selectedBlockFolder.destroy();
}

function selectBlock(block: BlockType) {
  selectedBlock = block;
  transformControls.attach(block);
  transformControls.visible = true;
  expectedBlock.visible = false;

  selectedBlockFolder = gui.addFolder("Selected Block");
  selectedBlockFolder.add(block.position, "x").listen();
  selectedBlockFolder.add(block.position, "y").listen();
  selectedBlockFolder.add(block.position, "z").listen();
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
  const newBlock = new TracedObject(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMaterial));
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
let previousSelectedBlockPosition: THREE.Vector3 | undefined;

requestAnimationFrame(function animate(time) {
  requestAnimationFrame(animate);

  const overlap = world.tracedObjects.some(
    (o) =>
      o.object.name.startsWith("block") &&
      o.object !== selectedBlock &&
      selectedBlock?.position.equals(o.object.position),
  );
  if (overlap) {
    selectedBlock?.position.copy(previousSelectedBlockPosition!);
  }

  previousSelectedBlockPosition = selectedBlock?.position.clone();

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
let selectedBlockFolder: dat.GUI;

const dataFolder = gui.addFolder("Data");
const fileDownloadElement = document.createElement("a");
fileDownloadElement.download = "block-map-data.json";
dataFolder.add(
  {
    Save: () => {
      const data = world.tracedObjects
        .filter((o) => o.object.name.startsWith("block"))
        .map((o) => {
          return {
            name: o.object.name,
            position: o.object.position.toArray(),
          };
        });
      const dataString = JSON.stringify(data);
      const blob = new Blob([dataString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      fileDownloadElement.href = url;
      fileDownloadElement.click();
    },
  },
  "Save",
);
const fileUploadElement = document.createElement("input");
fileUploadElement.type = "file";
fileUploadElement.accept = ".json";
fileUploadElement.style.display = "none";
fileUploadElement.addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target?.result as string);
    data.forEach((block: { name: string; position: number[] }) => {
      const newBlock = new TracedObject(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMaterial));
      newBlock.object.position.fromArray(block.position);
      newBlock.object.name = block.name;
      newBlock.bind(world);
    });
  };
  reader.readAsText(file);
});
dataFolder.add(
  {
    Load: () => {
      fileUploadElement.click();
    },
  },
  "Load",
);

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

let sunLightHelperVisibleCache = sunLightHelper.visible;
const sunLightHelperController = helperFolder
  .add(sunLightHelper, "visible")
  .name("Sun Light")
  .onChange((v: boolean) => {
    sunLightHelperVisibleCache = v;
  });

const sunLightFolder = gui.addFolder("Sun Light");
sunLightFolder.add(sunLight, "visible").onChange((v: boolean) => {
  if (v) {
    sunLightHelperController.enable();
    sunLightHelper.visible = sunLightHelperVisibleCache;
  } else {
    sunLightHelperController.disable();
    sunLightHelper.visible = false;
  }
});
sunLightFolder.add(sunLight, "intensity", 0, 1, 0.1);
sunLightFolder.add({ angle: 0 }, "angle", 0, 360, 1).onChange((theta: number) => {
  const x = Math.cos((theta * Math.PI) / 180) * 13;
  const z = Math.sin((theta * Math.PI) / 180) * 13;
  sunLight.position.set(x, 10, z).add(centerOfScene);
  sunLightHelper.update();
});
sunLightFolder
  .add(sunLight.position, "y", 0, 20, 0.5)
  .name("Height")
  .onChange(() => sunLightHelper.update());

const blockFolder = gui.addFolder("Block");
const blockImageController = blockFolder
  .addImage({ image: defaultBlockTextureUrl }, "image")
  .onChange((url: string) => {
    imageLoader.load(url, (image) => {
      blockTexture.image = resizeImage(image);
      blockTexture.generateMipmaps;
      blockTexture.needsUpdate = true;
    });
  });
blockFolder.add({ reset: () => blockImageController.setValue(defaultBlockTextureUrl) }, "reset").name("Reset Image");
