import { createCamera } from "./components/camera.js";
import { createScene } from "./components/scene.js";
import { createCameraControls } from "./systems/cameraControls.js";
import { createRenderer } from "./systems/renderer.js";
import { Resizer } from "./systems/Resizer.js";
import { gltfLoad } from "./components/gltf_loader/gltfLoad.js";
import { hdriLoad } from "./components/hdri_loader/hdri_loader.js";
import { createCube } from "./components/cube.js";
import { DebugUI } from "./systems/DebugUi.js";
import { AnimLoop } from "./systems/AnimLoop.js";
import { BoxGeometry, Color, DirectionalLight, DirectionalLightHelper, DoubleSide, GridHelper, InstancedBufferAttribute, InstancedMesh, LoopPingPong, Mesh, MeshPhysicalNodeMaterial, MeshStandardMaterial, Object3D, Plane, PlaneGeometry, ShadowMaterial, ShadowNodeMaterial } from "three/webgpu";
import { Pane } from "tweakpane";


import { XRButton } from 'three/addons/webxr/XRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { MathUtils } from "three";
import { abs, color, float, If, instancedBufferAttribute, instanceIndex, mix, mod, modelScale, mul, mx_noise_float, mx_noise_vec3, objectScale, positionGeometry, positionLocal, positionWorld, remap, remapClamp, select, time, uniform, vec3 } from "three/tsl";
import { Fn, mx_fractal_noise_float } from "three/src/nodes/TSL.js";
import { sub } from "three/tsl";
import { screenUV } from "three/tsl";

// These variables are module-scoped: we cannot access them
// from outside the module
let camera;
let renderer;
let scene;
let controls;
let cube;
let tweakPaneUI;
let loop;
let debugUI;


class World {
  constructor(container) {
    camera = createCamera();
    scene = createScene();
    renderer = createRenderer();
    cube = createCube();
    cube.position.set(5, 0, 0)

    loop = new AnimLoop(camera, scene, renderer);
    loop.updatables.push(cube);
    // tweakPaneUI = new Pane();


    debugUI = new DebugUI(scene);
    // debugUI.addUI(cube, "cube");
    loop.updatables.push(debugUI.stats);
    // debugUI.gridHelper.visible = false;


    // scene.add(cube);
    //WINDOW RESIZER
    const resizer = new Resizer(container, camera, renderer);
    container.append(renderer.domElement);

    controls = createCameraControls(camera, renderer.domElement);
    loop.updatables.push(controls);
  }

  //SETS UP BACKGROUND
  async loadBackground() {
    const { background1, hdri1 } = await hdriLoad();
    // scene.background = background1;
    scene.background = screenUV.distance(0.5).remap(0, 0.75).mix(color(0xffffff), color(0x000000));

    scene.environment = hdri1;
    scene.environmentIntensity = 0.25;
  }

  //GLTF LOADER
  async loadGltf() {
    const { loadedmodel } = await gltfLoad(renderer);
    // scene.add(loadedmodel);

    // console.log(loadedmodel)
    // tweakPaneUI.addUI(loadedmodel, "GLTFModel");

    const dirLight = new DirectionalLight(0xffffff, 3);
    dirLight.position.set(-5, 10, 0)
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
    // dirLight.shadow.radius = 7;

    // const plane2 = new Mesh(new PlaneGeometry(50, 50), new MeshStandardMaterial({ color: 0x808080,side: DoubleSide }));
    // plane2.position.set(10, 25, -5);
    // plane2.castShadow = true;
    // scene.add(plane2);

    const dirLightHelper = new DirectionalLightHelper(dirLight, 5);
    scene.add(dirLight);
    dirLight.castShadow = true;

    const groundGeo = new PlaneGeometry(100, 100);
    groundGeo.rotateX(MathUtils.degToRad(90));
    const groundGeoMat = new ShadowNodeMaterial();
    groundGeoMat.side = DoubleSide;
    const groundMesh = new Mesh(groundGeo, groundGeoMat);

    groundGeoMat.colorNode = color(0.05, 0.05, 0.05);

    // groundMesh.castShadow = true;
    groundMesh.receiveShadow = true;

    scene.add(groundMesh);

    let size = 0.3;
    let sizeOffset = size * 1.05;
    const cube = new BoxGeometry(size, size, size);
    const instanceMat = new MeshPhysicalNodeMaterial()
    const cubeMesh = new Mesh(cube, instanceMat);

    let xAmount = 15;
    let yAmount = 25;
    let zAmount = 15;

    let xOffset = (xAmount - 1) / 2;
    let zOffset = (zAmount - 1) / 2;


    let totalInsatances = xAmount * yAmount * zAmount;

    // instanceMat.colorNode = positionLocal

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

    console.log(positions)

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


    let noiseNode = Fn(({ timeMul, texScale }) => {
      let noise = mx_noise_float(
        instancePosition.mul(texScale),
        0.75,
        0.5,);

      noise = remapClamp(noise, 0, 1, 0, 1).add(time.mul(timeMul))

      return noise;
    })




    let colors = {
      color0: uniform(new Color(PARAMS.color0.r, PARAMS.color0.g, PARAMS.color0.b)),
      color1: uniform(new Color(PARAMS.color1.r, PARAMS.color1.g, PARAMS.color1.b)),
      color2: uniform(new Color(PARAMS.color2.r, PARAMS.color2.g, PARAMS.color2.b)),
    }

    let colorsNode = Fn(({ color0, color1, color2 }) => {
      let val = noiseNode(textureUniforms).mod(1);

      let colorNew = color0.toVar();

      If(val.greaterThan(divisions * 2), () => { colorNew.assign(color1) })
        .ElseIf(val.greaterThan(divisions), () => {
          colorNew.assign(color2)
        })

      return colorNew;
    })


    let metalNode = Fn(() => {
      let val = noiseNode(textureUniforms).mod(1);
      let metanless = float(0).toVar();

      If(val.greaterThan(divisions * 2), () => { metanless.assign(1) })

      return metanless;
    })



    let posNode = Fn(() => {

      let val = noiseNode(textureUniforms).mod(divisions).div(divisions);

      let val1 = remap(val, 0, 1, 0, 1);
      let val2 = remap(val, 1, 0, 0, 1);

      let newVal = mix(val1, val2, val.greaterThan(0.5));



      newVal = remapClamp(newVal.mul(5), 0, 1, 0, 1);

      return newVal;
    })



    // instanceMat.colorNode = noiseNode();
    instanceMat.colorNode = colorsNode(colors);
    // instanceMat.colorNode = posNode(colors);

    instanceMat.metalnessNode = metalNode();
    instanceMat.roughnessNode = remapClamp(metalNode().oneMinus(), 0, 1, 0.25,0.5);



    instanceMat.positionNode = positionGeometry.mul(posNode());
    scene.add(instanceMesh);


    let instanceControlls = debugUI.tweakPaneUI.addFolder({
      title: "Instance Controls"
    });

    instanceControlls.addBinding(PARAMS, 'color0', {
      color: { type: 'float' },
    }).on('change', (ev) => {
      colors.color0.value.set(ev.value.r, ev.value.g, ev.value.b);
    });


    instanceControlls.addBinding(PARAMS, 'color1', {
      color: { type: 'float' },
    }).on('change', (ev) => {
      colors.color1.value.set(ev.value.r, ev.value.g, ev.value.b);
    });

    instanceControlls.addBinding(PARAMS, 'color2', {
      color: { type: 'float' },
    }).on('change', (ev) => {
      colors.color2.value.set(ev.value.r, ev.value.g, ev.value.b);
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
