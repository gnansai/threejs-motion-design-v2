import {

  MathUtils,
  Mesh,
  MeshStandardMaterial,
} from "three/webgpu";
import { BoxGeometry } from "three/webgpu";
import { mx_worley_noise_vec3 } from "three/tsl";
import { MeshStandardNodeMaterial } from "three/webgpu";

function createCube(x, y, z) {
  const geometry = new BoxGeometry(2, 2, 2);
  const material = new MeshStandardNodeMaterial();
  material.colorNode = mx_worley_noise_vec3();
  const cube = new Mesh(geometry, material);
  cube.rotation.set(-0.5, -0.1, 0.8);
  const radiansPerSecond = MathUtils.degToRad(30);

  cube.tick = (delta) => {
    // increase the cube's rotation each frame
    cube.rotation.z += radiansPerSecond * delta;
    cube.rotation.x += radiansPerSecond * delta;
    cube.rotation.y += radiansPerSecond * delta;
  };



  return cube;
}

export { createCube };
