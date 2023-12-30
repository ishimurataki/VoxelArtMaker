import { GlobalState, TracerMaterial } from "./global_state.js";
import { vec3 } from "./gl-matrix/index.js";
import { PolarCamera, Mode } from "./polar_camera.js";
import Scene from "./renderables/scene.js";

enum COLOR_MODE {
    CUBE,
    BACKGROUND
};

export default class Controls {

    private globalState: GlobalState;
    private camera: PolarCamera;
    private scene: Scene;

    private mouseDown: boolean = false;
    private shiftDown: boolean = false;
    private moveSun: boolean = false;
    private cubePlacedInCurrentPos: boolean = false;
    private xIndex: number = -1;
    private zIndex: number = -1;
    private layer: number = 0;
    private movementSpeed: number = 0.01;
    private zoomSpeed: number = -0.008;
    private layerScrollSpeed: number = 0.005;
    private colorMode = COLOR_MODE.CUBE;

    constructor(globalState: GlobalState, camera: PolarCamera, scene: Scene) {
        this.globalState = globalState;
        this.camera = camera;
        this.scene = scene;
    }

    registerControls() {
        this.globalState.canvas.addEventListener('mousemove', this.moveHandler, false);
        this.globalState.canvas.addEventListener('click', this.clickHandler, false);
        this.globalState.canvas.addEventListener('mousedown', this.mouseDownHandler, false);
        this.globalState.canvas.addEventListener('mouseup', this.mouseUpHandler, false);
        this.globalState.canvas.addEventListener('wheel', this.mousewheelHandler, false);
        document.addEventListener('keydown', this.keyDownHandler, false);
        document.addEventListener('keyup', this.keyUpHandler, false);
        document.addEventListener('coloris:pick', this.colorisPickHandler);
        document.getElementById("downloadButton")?.addEventListener('click', this.downloadButtonClickHandler, false);
        document.getElementById("toggleSunButton")?.addEventListener('click', this.toggleSunButtonClickHandler, false);
        document.getElementById("closeEditorButton")?.addEventListener('click', this.closeEditorButtonClickHandler, false);
        document.getElementById("openEditorButton")?.addEventListener('click', this.openEditorButtonClickHanlder, false);
        document.getElementById("modelLoadButton")?.addEventListener('click', this.modelLoadButtonClickHandler, false);
        document.getElementById("cubeColor")?.addEventListener('click', this.cubeColorClickHandler, false);
        document.getElementById("backgroundColor")?.addEventListener('click', this.backgroundColorClickHandler, false);
        document.getElementById("rayTraceButton")?.addEventListener('click', this.rayTraceButtonClickHandler, false);
        document.getElementById("tracerMaterial")?.addEventListener('change', this.tracerMaterialChangeHandler, false);
    }

    private moveHandler = (e: MouseEvent) => {
        const rect = this.globalState.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clipX = x / rect.width * 2 - 1;
        const clipY = y / rect.height * -2 + 1;

        const start: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, -1), this.globalState.viewProjectionInverse);
        const end: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, 1), this.globalState.viewProjectionInverse);

        const v: vec3 = vec3.sub(vec3.create(), end, start);
        if (this.camera.getMode() == Mode.Editor) {

            let currentLayerY = Math.round(this.layer) / this.globalState.divisionFactor;
            let t = (currentLayerY - start[1]) / v[1];

            let cursorXWorld = start[0] + t * v[0];
            let cursorZWorld = start[2] + t * v[2];

            let xIndexNow = Math.floor((cursorXWorld - this.globalState.upperLeft[0]) / this.globalState.sideLength);
            let zIndexNow = Math.floor((cursorZWorld - this.globalState.upperLeft[1]) / this.globalState.sideLength);

            if (xIndexNow != this.xIndex || zIndexNow != this.zIndex) {
                this.globalState.renderHoverCube = this.scene.setHoverCubePosition(xIndexNow, zIndexNow);
                this.cubePlacedInCurrentPos = false;
                this.xIndex = xIndexNow;
                this.zIndex = zIndexNow;
            }
            if (this.mouseDown && !this.cubePlacedInCurrentPos) {
                if (this.shiftDown) {
                    this.globalState.renderHoverCube = false;
                    this.scene.deleteCube(this.xIndex, this.zIndex);
                } else {
                    this.scene.addCube(this.xIndex, this.zIndex);
                }
                this.cubePlacedInCurrentPos = true;
            }
        } else if (this.camera.getMode() == Mode.Viewer) {
            // Detect if curser is over sun box
            let sunHit = false;
            for (let i = 0; i < 3; i++) {
                let t = (this.scene.sunCorner[i] - start[i]) / v[i];
                let dim1 = (i + 1) % 3;
                let dim2 = (i + 2) % 3;
                let dim1Value = start[dim1] + t * v[dim1];
                let dim2Value = start[dim2] + t * v[dim2];
                let dim1FromSun = dim1Value - this.scene.sunCorner[dim1];
                let dim2FromSun = dim2Value - this.scene.sunCorner[dim2];
                if (dim1FromSun >= 0 && dim1FromSun <= this.globalState.sideLength
                    && dim2FromSun >= 0 && dim2FromSun <= this.globalState.sideLength) {
                    sunHit = true;
                    break;
                }
                t = (this.scene.sunCorner[i] + this.globalState.sideLength - start[i]) / v[i];
                dim1Value = start[dim1] + t * v[dim1];
                dim2Value = start[dim2] + t * v[dim2];
                dim1FromSun = dim1Value - this.scene.sunCorner[dim1];
                dim2FromSun = dim2Value - this.scene.sunCorner[dim2];
                if (dim1FromSun >= 0 && dim1FromSun <= this.globalState.sideLength
                    && dim2FromSun >= 0 && dim2FromSun <= this.globalState.sideLength) {
                    sunHit = true;
                    break;
                }
            }
            this.globalState.renderSunSelection = sunHit;

            if (this.mouseDown) {
                let xMove = e.movementX * this.movementSpeed;
                let yMove = e.movementY * this.movementSpeed;
                if (sunHit) {
                    this.moveSun = true;
                }
                if (this.moveSun) {
                    let a = vec3.sub(vec3.create(), this.scene.sunCenter, this.camera.getPosition());
                    let b = vec3.sub(vec3.create(), this.camera.ref, this.camera.getPosition());
                    let projection = vec3.dot(a, b) / Math.pow(vec3.length(b), 2);
                    let passThroughPoint = vec3.add(vec3.create(), this.camera.getPosition(), vec3.scale(vec3.create(), b, projection));

                    let tNumerator = (b[0] * (start[0] - passThroughPoint[0])) +
                        (b[1] * (start[1] - passThroughPoint[1])) +
                        (b[2] * (start[2] - passThroughPoint[2]));
                    let tDenominator = (-b[0] * v[0]) - (b[1] * v[1]) - (b[2] * v[2]);
                    let tNew = tNumerator / tDenominator;
                    let sunPosition = vec3.add(vec3.create(), start, vec3.scale(vec3.create(), v, tNew));
                    this.scene.setSunCenter(sunPosition);
                } else {
                    this.camera.rotateTheta(xMove);
                    this.camera.rotatePhi(yMove);
                }
                this.globalState.sampleCount = 0;
            }
        }
    }

    private clickHandler = (e: PointerEvent) => {
        if (this.camera.getMode() == Mode.Editor) {
            if (this.shiftDown) {
                this.globalState.renderHoverCube = false;
                this.scene.deleteCube(this.xIndex, this.zIndex);
            } else {
                this.scene.addCube(this.xIndex, this.zIndex);
            }
        }
    }

    private mouseDownHandler = (e: MouseEvent) => {
        switch (e.button) {
            case 0:
                this.mouseDown = true;
                break;
        }
    }

    private mouseUpHandler = (e: MouseEvent) => {
        switch (e.button) {
            case 0:
                this.mouseDown = false;
                this.moveSun = false;
                break;
        }
    }

    private mousewheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        if (this.camera.getMode() == Mode.Viewer) {
            let zoom = this.zoomSpeed * e.deltaY;
            this.camera.zoom(zoom);
            this.globalState.sampleCount = 0;
        } else if (this.camera.getMode() == Mode.Editor) {
            let prevLayer = Math.round(this.layer);
            let layerScroll = this.layerScrollSpeed * e.deltaY;
            this.layer = Math.min(this.globalState.divisionFactor - 1, Math.max(0, this.layer - layerScroll));
            let currentLayer = Math.round(this.layer);
            if (prevLayer != currentLayer) {
                let layerLabel = document.getElementById("layerLabel");
                if (layerLabel != null) {
                    layerLabel.innerHTML = currentLayer.toString();
                }
                this.globalState.renderHoverCube = false;
                console.log("Setting layer to: " + currentLayer);
                this.camera.setEditorRef(vec3.fromValues(0.0, currentLayer / this.globalState.divisionFactor, 0.0));
                this.globalState.transitioning = true;
                this.globalState.transitionTime = 0;
                this.scene.setCubeLayer(currentLayer);
            }
        }
    }

    private keyDownHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                this.shiftDown = true;
                break;
            case "Space":
                e.preventDefault();
        }
    }

    private keyUpHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                this.shiftDown = false;
                break;
            case "Space":
                if (this.camera.getMode() == Mode.Editor) {
                    this.toggleToViewer();
                } else if (this.camera.getMode() == Mode.Viewer) {
                    this.globalState.renderHoverCube = false;
                    this.globalState.transitioning = true;
                    this.globalState.transitionTime = 0;
                    this.camera.changeToEditor();
                }
        }
    }

    private toggleToViewer = () => {
        this.globalState.renderHoverCube = false;
        this.globalState.transitioning = true;
        this.globalState.transitionTime = 0;
        let yRange: vec2 = this.scene.cubeSpace.populateBuffers();
        let viewerRefY = (yRange[0] + yRange[1]) / (2 * this.globalState.divisionFactor);
        this.camera.setViewerRef(vec3.fromValues(0, viewerRefY, 0));
        this.camera.changeToViewer();
        this.scene.cubeSpace.populateTexture();
    }

    private colorisPickHandler = (e: any) => {
        let rgbString = e.detail.color;
        let rgbArray = rgbString.slice(
            rgbString.indexOf("(") + 1,
            rgbString.indexOf(")")
        ).split(", ");
        if (this.colorMode == COLOR_MODE.CUBE) {
            let hoverCubeColor = vec3.fromValues(
                rgbArray[0] / 255,
                rgbArray[1] / 255,
                rgbArray[2] / 255
            );
            this.scene.setHoverCubeColor(hoverCubeColor);
        } else if (this.colorMode == COLOR_MODE.BACKGROUND) {
            let newBackgroundColor = vec3.fromValues(rgbArray[0] / 255,
                rgbArray[1] / 255,
                rgbArray[2] / 255);
            this.scene.setBackgroundColor(newBackgroundColor);
        }
    }

    private downloadButtonClickHandler = (e: PointerEvent) => {
        let cubeSpaceString = JSON.stringify(this.scene.cubeSpace.cubeSpace);
        const file = new File([cubeSpaceString], 'voxel_design.txt', {
            type: 'text/plain',
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(file);

        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    private toggleSunButtonClickHandler = () => {
        this.scene.toggleSun();
    }

    private closeEditorButtonClickHandler = () => {
        let editorPaneElement = document.getElementById("editorPane");
        if (editorPaneElement != null) {
            editorPaneElement.style.display = "none";
        }
    }

    private openEditorButtonClickHanlder = () => {
        let editorPaneElement = document.getElementById("editorPane");
        if (editorPaneElement != null) {
            editorPaneElement.style.display = "block";
        }
    }

    private modelLoadButtonClickHandler = () => {
        let selectElement = document.getElementById("models");
        if (selectElement != null) {
            let modelName = (selectElement as HTMLSelectElement).value;
            fetch("/models/" + modelName)
                .then((res) => {
                    return res.text();
                })
                .then((text) => {
                    let model: (vec3 | undefined)[] = JSON.parse(text);
                    this.scene.cubeSpace.setCubeSpace(model);
                    this.toggleToViewer();
                    this.scene.setCubeLayer(Math.round(this.layer));
                })
                .catch((e) => console.error(e));
        }
    }

    private cubeColorClickHandler = () => {
        this.colorMode = COLOR_MODE.CUBE;
    }

    private backgroundColorClickHandler = () => {
        this.colorMode = COLOR_MODE.BACKGROUND;
    }

    private rayTraceButtonClickHandler = () => {
        this.globalState.rayTrace = !this.globalState.rayTrace;
        this.globalState.sampleCount = 0;
    }

    private tracerMaterialChangeHandler = () => {
        let selectElement = document.getElementById("tracerMaterial");
        if (selectElement != null) {
            let materialName = (selectElement as HTMLSelectElement).value;
            if (materialName == "diffuse") {
                this.globalState.tracerMaterial = TracerMaterial.Diffuse;
            } else if (materialName == "mirror") {
                this.globalState.tracerMaterial = TracerMaterial.Mirror;
            }
        }
        this.globalState.sampleCount = 0;
    }
}