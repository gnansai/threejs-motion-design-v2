import { PerspectiveCamera } from "three/webgpu";
import { Group } from "three/webgpu";

function createCamera() {
  const camera = new PerspectiveCamera(
    30, // fov = Field Of View
    1, // aspect ratio (dummy value)
    0.1, // near clipping plane
    100 // far clipping plane);
  );

  camera.position.set(0, 15, 25);
  return camera;
}
export { createCamera };
