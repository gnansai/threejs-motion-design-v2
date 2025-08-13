import Stats from "three/examples/jsm/libs/stats.module.js";
import { AxesHelper, GridHelper, MathUtils } from "three/webgpu";
import { Pane } from "tweakpane"




class DebugUI {
    constructor(scene, gridSize = 10, gridDivisions = 10, gridVisible = true, axesSize = 5, axesVisible = true) {
        this.tweakPaneUI = new Pane({
            title: "Debug-UI"
        });
        this.scene = scene;
        this.gridHelper = null;
        this.axesHelper = null;

        this.helperParams = {
            gridSize: gridSize,
            gridDivisions: gridDivisions,
            gridVisible: true,
            axesSize: axesSize,
            axesVisible: true,
        };

        this.addGridHelper();
        this.addHelperControls();

        this.addAxesHelper(this.helperParams.axesSize);
        this.stats = new Stats();
        
        document.body.appendChild(this.stats.dom);
        this.stats.tick = () => this.stats.update();

    }

    // Method to control grid size and divisions using Tweakpane
    addHelperControls() {
        const folder = this.tweakPaneUI.addFolder({
            title: "Helper Controls"
        });

        folder.expanded = false;

        // Add bindings for size and divisions of the grid helper
        folder.addBinding(this.helperParams, 'gridSize', { min: 1, max: 50, step: 1 })
            .on('change', (ev) => {
                this.addGridHelper();
            });

        folder.addBinding(this.helperParams, 'gridDivisions', { min: 1, max: 50, step: 1 })
            .on('change', (ev) => {
                this.addGridHelper();
            });

        folder.addBinding(this.helperParams, 'gridVisible')
            .on('change', (ev) => {
                this.gridHelper.visible = ev.value;
            });

        folder.addBinding(this.helperParams, 'axesSize', { min: 1, max: 50, step: 1 })
            .on('change', (ev) => {
                this.addAxesHelper( ev.value);
            });

        folder.addBinding(this.helperParams, 'axesVisible')
            .on('change', (ev) => {
                this.axesHelper.visible = ev.value;

            });
    }

    addAxesHelper(size = 5) {
        if (this.axesHelper) {
            this.scene.remove(this.axesHelper);
            this.axesHelper.dispose(); // Remove existing gridHelper if already added
        }
        this.axesHelper = new AxesHelper(size);
        this.scene.add(this.axesHelper);
        this.axesHelper.visible =  this.helperParams.axesVisible;
    }

    addGridHelper() {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.dispose(); // Remove existing gridHelper if already added
        }
        this.gridHelper = new GridHelper(this.helperParams.gridSize, this.helperParams.gridDivisions);
        this.scene.add(this.gridHelper);
        this.gridHelper.visible =  this.helperParams.gridVisible;
        console.log(this.gridHelper);
    }

    addUI(obj, title) {

        const transformParameters = {
            position: {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z
            },
            rotation: {
                x: MathUtils.radToDeg(obj.rotation.x),
                y: MathUtils.radToDeg(obj.rotation.y),
                z: MathUtils.radToDeg(obj.rotation.z)
            },
            scale: {
                x: obj.scale.x,
                y: obj.scale.y,
                z: obj.scale.z,
            },
        }

        const otherParams = {
            visible: obj.visible,
        }

        let folder = this.tweakPaneUI.addFolder({
            title: title + "-" + obj.name,
        })

        for (const [key, value] of Object.entries(transformParameters)) {
            folder.addBinding(transformParameters, key).on("change", (ev) => {
                if (key == "rotation") {
                    obj[key].set(
                        MathUtils.degToRad(ev.value.x),
                        MathUtils.degToRad(ev.value.y),
                        MathUtils.degToRad(ev.value.z))
                } else {
                    obj[key].set(ev.value.x, ev.value.y, ev.value.z);
                }
            });
        }


        folder.addBinding(otherParams, "visible").on("change", (ev) => {
            obj.visible = !obj.visible;
        });


    }

    updateStats() {
        this.stats.update();
    }

}

export { DebugUI }