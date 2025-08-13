import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { setupModel } from "./setupModel.js";

import { LoadingManager } from "three/webgpu";
import { DRACOLoader } from 'three/examples/jsm/Addons.js';




async function gltfLoad(renderer) {
  const loader = new GLTFLoader();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/decoder/');
  loader.setDRACOLoader(dracoLoader);

  const modelData = await loader.loadAsync("/models/materials_test_optimized.glb");

  const loadedmodel = setupModel(modelData);

  return { loadedmodel };
}

export { gltfLoad };
