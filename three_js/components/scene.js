import { Color, Scene } from "three/webgpu";

function createScene() {
  const scene = new Scene();
  scene.background = new Color("white");
  return scene;
}

export { createScene };
