import { World } from "./three_js/World.js";

async function main() {
  const container = document.querySelector("#scene-container");
  const world = new World(container);
  world.loadBackground();
  world.loadGltf();
  world.start();

}

main().catch((err) => {
  console.error(err);
});
