import { createCamera } from "./components/camera.js";
import { createScene } from "./components/scene.js";
import { createCameraControls } from "./systems/cameraControls.js";
import { createRenderer } from "./systems/renderer.js";
import { Resizer } from "./systems/Resizer.js";

import { hdriLoad } from "./components/hdri_loader/hdri_loader.js";
import { DebugUI } from "./systems/DebugUi.js";
import { AnimLoop } from "./systems/AnimLoop.js";
import { BoxGeometry, Color, DirectionalLight, DoubleSide, InstancedBufferAttribute, InstancedMesh, Mesh, MeshPhysicalNodeMaterial, Object3D, PlaneGeometry, ShadowNodeMaterial } from "three/webgpu";

import { MathUtils } from "three";
import { color, float, If, instancedBufferAttribute, mix, mx_noise_float, positionGeometry, remap, remapClamp, time, uniform } from "three/tsl";
import { Fn } from "three/src/nodes/TSL.js";

import { screenUV } from "three/tsl";

// These variables are module-scoped: we cannot access them
// from outside the module
let camera;
let renderer;
let scene;
let controls;
let loop;
let debugUI;


class World {
  constructor(container) {
    camera = createCamera();
    scene = createScene();
    renderer = createRenderer();

    loop = new AnimLoop(camera, scene, renderer);

    debugUI = new DebugUI(scene);
    loop.updatables.push(debugUI.stats);

    //WINDOW RESIZER
    const resizer = new Resizer(container, camera, renderer);
    container.append(renderer.domElement);

    controls = createCameraControls(camera, renderer.domElement);
    loop.updatables.push(controls);
  }

  //SETS UP BACKGROUND
  async loadBackground() {
    const { background1, hdri1 } = await hdriLoad();

    scene.background = screenUV.distance(0.5).remap(0, 0.75).mix(color(0xffffff), color(0x000000));
    scene.environment = hdri1;
    scene.environmentIntensity = 0.25;
  }


  async createGeometry() {

    //Directional Light
    const dirLight = new DirectionalLight(0xffffff, 3);
    dirLight.position.set(0, 10, 0)
    dirLight.target.position.set(0, 0, 15);
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.near = 0.1;

    dirLight.shadow.bias = -0.005;
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(dirLight.target);

    // const dirLightHelper = new DirectionalLightHelper(dirLight, 5);
    // scene.add(dirLightHelper);


    //GroundPlane
    const groundGeo = new PlaneGeometry(100, 100);
    groundGeo.rotateX(MathUtils.degToRad(90));

    const groundGeoMat = new ShadowNodeMaterial();
    groundGeoMat.colorNode = color(0.05, 0.05, 0.05);
    groundGeoMat.side = DoubleSide;

    const groundMesh = new Mesh(groundGeo, groundGeoMat);
    groundMesh.receiveShadow = true;

    scene.add(groundMesh);


    //Instanced Mesh
    let size = 0.3;
    let sizeOffset = size * 1.025;
    const cube = new BoxGeometry(size, size, size);
    const instanceMat = new MeshPhysicalNodeMaterial()

    let xAmount = 15;
    let yAmount = 25;
    let zAmount = 15;

    let xOffset = (xAmount - 1) / 2;
    let zOffset = (zAmount - 1) / 2;

    let totalInsatances = xAmount * yAmount * zAmount;
    const instanceMesh = new InstancedMesh(cube, instanceMat, totalInsatances);
    instanceMesh.position.set(0, size / 2, 0)

    instanceMesh.castShadow = true;
    instanceMesh.receiveShadow = true;

    let dummy = new Object3D();

    let i = 0;

    const positions = [];
    for (let x = 0; x < xAmount; x++) {
      for (let y = 0; y < yAmount; y++) {
        for (let z = 0; z < zAmount; z++) {
          dummy.position.set((x - xOffset) * sizeOffset, y * sizeOffset, (z - zOffset) * sizeOffset);
          positions.push(dummy.position.x, dummy.position.y, dummy.position.z);
          // dummy.scale.set(0.5,0.5,0.5);
          dummy.updateMatrix();
          instanceMesh.setMatrixAt(i, dummy.matrix);
          i++
        }
      }
    }

    instanceMesh.tick = () => {
      instanceMesh.rotateY(0.002);
    }

    loop.updatables.push(instanceMesh);
    const positionAttribute = new InstancedBufferAttribute(new Float32Array(positions), 3);
    const instancePosition = instancedBufferAttribute(positionAttribute);

    let divisions = 1 / 3;

    const PARAMS = {
      color0: { r: 0.1, g: 0.1, b: 0.1 },
      color1: { r: 1, g: 0.843, b: 0 },
      color2: { r: 1, g: 1, b: 1 },
      timeMul: 0.1,
      texScale: 0.2,
    };

    let textureUniforms = {
      timeMul: uniform(PARAMS.timeMul),
      texScale: uniform(PARAMS.texScale),
    }

    let colorUniforms = {
      color0: uniform(new Color(PARAMS.color0.r, PARAMS.color0.g, PARAMS.color0.b)),
      color1: uniform(new Color(PARAMS.color1.r, PARAMS.color1.g, PARAMS.color1.b)),
      color2: uniform(new Color(PARAMS.color2.r, PARAMS.color2.g, PARAMS.color2.b)),
    }

    //BaseNoise
    let noiseNode = Fn(({ timeMul, texScale }) => {
      let noise = mx_noise_float(
        instancePosition.mul(texScale),
        0.75,
        0.5,);
      noise = remapClamp(noise, 0, 1, 0, 1).add(time.mul(timeMul))
      return noise;
    })

    //Calculate the scales of the instances
    let posNode = Fn(() => {
      let val = noiseNode(textureUniforms).mod(divisions).div(divisions);
      let val1 = remap(val, 0, 1, 0, 1);
      let val2 = remap(val, 1, 0, 0, 1);
      let newVal = mix(val1, val2, val.greaterThan(0.5));
      newVal = remapClamp(newVal.mul(5), 0, 0.75, 0, 1);
      return newVal;
    })

    //Calculate colors
    let colorsNode = Fn(({ color0, color1, color2 }) => {
      let val = noiseNode(textureUniforms).mod(1);
      let colorNew = color0.toVar();
      If(val.greaterThan(divisions * 2), () => { colorNew.assign(color1) })
        .ElseIf(val.greaterThan(divisions), () => {
          colorNew.assign(color2)
        })
      let colorNew2 = mix(colorNew.mul(0.2), colorNew, posNode());
      return colorNew2;
    })

    //Calculate Metalness
    let metalNode = Fn(() => {
      let val = noiseNode(textureUniforms).mod(1);
      let metanless = float(0).toVar();
      If(val.greaterThan(divisions * 2), () => { metanless.assign(1) })
      return metanless;
    })


    instanceMat.colorNode = colorsNode(colorUniforms);
    instanceMat.metalnessNode = metalNode();
    instanceMat.roughnessNode = remapClamp(metalNode().oneMinus(), 0, 1, 0.25, 0.5);

    instanceMat.positionNode = positionGeometry.mul(posNode());
    scene.add(instanceMesh);

    //TweakPane UI
    let instanceControlls = debugUI.tweakPaneUI.addFolder({
      title: "Instance Controls"
    });

    instanceControlls.addBinding(PARAMS, 'color0', {
      color: { type: 'float' },
    }).on('change', (ev) => {
      colorUniforms.color0.value.set(ev.value.r, ev.value.g, ev.value.b);
    });


    instanceControlls.addBinding(PARAMS, 'color1', {
      color: { type: 'float' },
    }).on('change', (ev) => {
      colorUniforms.color1.value.set(ev.value.r, ev.value.g, ev.value.b);
    });

    instanceControlls.addBinding(PARAMS, 'color2', {
      color: { type: 'float' },
    }).on('change', (ev) => {
      colorUniforms.color2.value.set(ev.value.r, ev.value.g, ev.value.b);
    });


    instanceControlls.addBinding(PARAMS, 'timeMul', { min: 0.1, max: 1, step: 0.01 })
      .on('change', (ev) => {
        textureUniforms.timeMul.value = ev.value;
      });

    instanceControlls.addBinding(PARAMS, 'texScale', { min: 0.1, max: 0.5, step: 0.01 })
      .on('change', (ev) => {
        textureUniforms.texScale.value = ev.value;
      });

  }




  start() {
    loop.start();


  }

  stop() {
    loop.stop();
  }
}

export { World };
