import { DirectionalLight } from "three/webgpu";

function createDirectionalLight(color = 0xffffff, intensity = 3 ) {
    const dirLight = new DirectionalLight(color, intensity);
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

    return dirLight;
}

export { createDirectionalLight };