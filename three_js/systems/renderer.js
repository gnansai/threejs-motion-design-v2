
import {
  WebGPURenderer, ACESFilmicToneMapping,
  SRGBColorSpace,
  PCFSoftShadowMap,
  UnsignedByteType,
} from "three/webgpu";

function createRenderer() {
  const renderer = new WebGPURenderer({ antialias: true });

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;
  renderer.xr.enabled = false;
  renderer.physicallyCorrectLights = true;

  return renderer;
}
export { createRenderer };
