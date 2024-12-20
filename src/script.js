import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon";
import CannonDebugger from "cannon-es-debugger";

const canvas = document.querySelector("canvas");

const scene = new THREE.Scene();

/** Loaders */

const rgbeLoader = new RGBELoader();
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

/** Sizes */

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Physics
 */

const plywoodMaterial = new CANNON.Material("plywood");
const plasticMaterial = new CANNON.Material("plastic");

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const sphereShape = new CANNON.Sphere(0.1);
const sphereBody = new CANNON.Body({
  mass: 1,
  // position: new CANNON.Vec3(0, 2, 0),
  position: new CANNON.Vec3(-0.75, 3, 1.6),

  shape: sphereShape,
  material: plasticMaterial,
});
world.addBody(sphereBody);

const batShape = new CANNON.Box(new CANNON.Vec3(0.24, 0.24, 0.24));
const batBody = new CANNON.Body({
  mass: 0,
  // position: new CANNON.Vec3(0, 2, 0),
  position: new CANNON.Vec3(0.6, 1.5, 1.5),

  shape: batShape,
  material: plywoodMaterial,
});
world.addBody(batBody);

// const tableShape = new CANNON.Plane();
const tableShape = new CANNON.Box(new CANNON.Vec3(1.6, 2.7, 0.01));
const tableBody = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, 1.5, 0),
  shape: tableShape,
  material: plywoodMaterial,
});
tableBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(tableBody);

const netShape = new CANNON.Box(new CANNON.Vec3(1.8, 0.1, 0.05));
const netBody = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, 1.5, 0),
  shape: netShape,
  material: plywoodMaterial,
});
netBody.position.set(0, 1.65, 0);

world.addBody(netBody);

const plywoodPlasticContactMaterial = new CANNON.ContactMaterial(
  plywoodMaterial,
  plasticMaterial,
  {
    friction: 0.1,
    restitution: 0.7,
  }
);

world.addContactMaterial(plywoodPlasticContactMaterial);

/** Models */

gltfLoader.load("/models/table_tennis_table.glb", (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(gltf.scene);
});

let batMeshes = [];
let selectedBat = null;

const objectsToTest = [];

gltfLoader.load("/models/bat/scene.gltf", (gltf) => {
  gltf.scene.scale.set(0.24, 0.24, 0.24);
  gltf.scene.position.set(0.6, 1.5, 1.5);
  gltf.scene.rotation.y = -Math.PI * 0.5;

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      batMeshes.push(child);
      objectsToTest.push(child);
    }
  });

  scene.add(gltf.scene);
});

/** Objects */

const ballColorTexture = textureLoader.load(
  "/textures/plastic/Plastic_004_basecolor.jpg"
);
const ballRoughnessTexture = textureLoader.load(
  "/textures/plastic/Plastic_004_roughness.jpg"
);
const ballNormalTexture = textureLoader.load(
  "/textures/plastic/Plastic_004_normal.jpg"
);

const ballAmbientOcclusionTexture = textureLoader.load(
  "/textures/plastic/Plastic_004_ambientOcclusion.jpg"
);
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 16),
  new THREE.MeshStandardMaterial({
    map: ballColorTexture,
    aoMap: ballAmbientOcclusionTexture,
    roughnessMap: ballRoughnessTexture,
    normalMap: ballNormalTexture,
  })
);
ballColorTexture.colorSpace = THREE.SRGBColorSpace;
ball.castShadow = true;
ball.receiveShadow = true;
scene.add(ball);

/**
 * Raycaster
 */

const raycaster = new THREE.Raycaster();
let currentIntersect = null;

/**
 * Mouse
 */
const mouse = new THREE.Vector2();

window.addEventListener("mousedown", () => {
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(objectsToTest, true);

  if (intersects.length) {
    selectedBat = intersects[0].object.parent;
  }
});

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / sizes.width) * 2 - 1;
  mouse.y = -(e.clientY / sizes.height) * 2 + 1;

  if (selectedBat) {
    raycaster.setFromCamera(mouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    const intersection = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, intersection)) {
      selectedBat.position.y = intersection.y;
      selectedBat.position.z = -intersection.x;

      batBody.position.y = selectedBat.position.y;
      batBody.position.x = selectedBat.position.z;
    }
  }
});

window.addEventListener("mouseup", () => {
  selectedBat = null;
});

/** Lighting */

const directionalLight = new THREE.DirectionalLight({ color: "white" }, 5);
directionalLight.position.y = 4;
directionalLight.position.z = 3;

directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 6;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.castShadow = true;

scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight({ color: "white" }, 5);
scene.add(ambientLight);

/** Camera */

const camera = new THREE.PerspectiveCamera(
  70,
  sizes.width / sizes.height,
  1,
  100
);

camera.position.z = 4;
camera.position.y = 2;

/** Helpers */

// const cameraHelper = new THREE.CameraHelper(camera);
// scene.add(cameraHelper);

// const directionalLightHelper = new THREE.DirectionalLightHelper(
//   directionalLight,
//   2
// );
// scene.add(directionalLightHelper);

// const directionalLightCameraHelper = new THREE.CameraHelper(
//   directionalLight.shadow.camera
// );
// scene.add(directionalLightCameraHelper);

/** Controls */

// const controls = new OrbitControls(camera, canvas);
// controls.enableDamping = true;

/** Renderer */

const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.render(scene, camera);

const cannonDebugger = new CannonDebugger(scene, world);

/** Animations */

const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  world.step(1 / 60, deltaTime, 3);
  ball.position.x = sphereBody.position.x;
  ball.position.y = sphereBody.position.y;
  ball.position.z = sphereBody.position.z;

  cannonDebugger.update();
  // controls.update();
  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
};

tick();
