import Renderable from "./renderable.js";
import Mesh from "./mesh.js";
import Grid from "./grid.js";
import Square from "./square.js";
import Cube from "./cube.js";
import SelectionBox from "./selection_box.js";
import CubeSpace from "./cube_space.js";

import { vec2, vec3, mat4 } from "../gl-matrix/index.js";
import GlobalState from "../global_state.js";

export default class Scene {
    gl: WebGLRenderingContext;
    backgroundColor: vec3 = vec3.fromValues(0.15, 0.15, 0.15);

    grid: Renderable;
    cubeLayer: Map<string, Renderable>;
    editorTiles: Set<Renderable>;
    hoverCube: Renderable;
    hoverCubeColor: ReadonlyVec3 = vec3.fromValues(0.31372, 0.7843, 0.47059);
    cubeSpace: CubeSpace;

    sun: Renderable;
    sunCenter: vec3;
    sunCorner: vec3;
    sunOn: boolean;
    sunSelection: Renderable;

    private gridMesh: Mesh;
    private cubeMesh: Mesh;
    private squareMesh: Mesh;
    private selectionMesh: Mesh;
    private currentLayer = 0;
    private globalState: GlobalState;

    constructor(gl: WebGLRenderingContext, globalState: GlobalState) {
        this.globalState = globalState;
        this.gridMesh = new Grid(gl, globalState.divisionFactor);
        this.squareMesh = new Square(gl, globalState.sideLength);
        this.cubeMesh = new Cube(gl, globalState.sideLength);
        this.selectionMesh = new SelectionBox(gl, globalState.sideLength);

        let gridModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(globalState.upperLeft[0], 0, globalState.upperLeft[1]));
        this.grid = new Renderable(this.gridMesh, vec3.fromValues(0.3, 0.3, 0.3), gridModelMatrix);
        this.editorTiles = new Set<Renderable>();
        this.cubeLayer = new Map<string, Renderable>();

        this.hoverCube = new Renderable(this.cubeMesh, this.hoverCubeColor, mat4.create());
        this.setHoverCubePosition(0, 0);

        this.cubeSpace = new CubeSpace(gl, globalState.divisionFactor, globalState.upperLeft);
        this.sunOn = true;
        this.sun = new Renderable(this.cubeMesh,
            vec3.fromValues(1.0, 1.0, 1.0),
            mat4.create());
        this.sunSelection = new Renderable(this.selectionMesh, vec3.fromValues(1.0, 0.0, 0.0),
            mat4.create());
        this.setSunCenter(vec3.fromValues(0.0, 0.5, 0.0));

        this.gl = gl;
    }

    private getCubeString(x: number, z: number): string {
        return "cube_" + x + "_" + z;
    }

    setCubeLayer(y: number): void {
        if (y >= 0 && y < this.globalState.divisionFactor) {
            this.editorTiles.clear();
            this.cubeLayer.clear();
            this.currentLayer = y;
            let yPad = y * Math.pow(this.globalState.divisionFactor, 2);
            let yBelowPad = (y - 1) * Math.pow(this.globalState.divisionFactor, 2);
            for (let x = 0; x < this.globalState.divisionFactor; x++) {
                let xPad = x * this.globalState.divisionFactor;
                for (let z = 0; z < this.globalState.divisionFactor; z++) {
                    let cubeColor = this.cubeSpace.cubeSpace[yPad + xPad + z];
                    if (cubeColor != undefined) {
                        this.addCubeToLayerOnly(x, z, cubeColor)
                    }
                    if (y >= 1) {
                        let cubeBelowColor = this.cubeSpace.cubeSpace[yBelowPad + xPad + z];
                        if (cubeBelowColor != undefined) {
                            this.addTile(x, z, cubeBelowColor);
                        }
                    }
                }
            }
            this.grid.modelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.globalState.upperLeft[0],
                this.currentLayer * this.globalState.sideLength,
                this.globalState.upperLeft[1]));
        }
    }

    setHoverCubePosition(x: number, z: number): boolean {
        if (x >= 0 && x < this.globalState.divisionFactor && z >= 0 && z < this.globalState.divisionFactor) {
            let hoverCubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.globalState.upperLeft[0] + this.globalState.sideLength * x,
                this.currentLayer * this.globalState.sideLength,
                this.globalState.upperLeft[1] + this.globalState.sideLength * z
            ));
            this.hoverCube.modelMatrix = hoverCubeModelMatrix;
            return true;
        }
        return false;
    }

    setHoverCubeColor(color: vec3) {
        this.hoverCubeColor = color;
    }

    setBackgroundColor(color: vec3) {
        this.backgroundColor = color;
    }

    addTile(x: number, z: number, color: vec3): boolean {
        if (x >= 0 && x < this.globalState.divisionFactor && z >= 0 && z < this.globalState.divisionFactor) {
            let tileModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.globalState.upperLeft[0] + this.globalState.sideLength * x,
                this.globalState.sideLength * this.currentLayer,
                this.globalState.upperLeft[1] + this.globalState.sideLength * z
            ));
            let tileColor = vec3.copy(vec3.create(), color);
            let tileRenderable = new Renderable(this.squareMesh, tileColor, tileModelMatrix);
            this.editorTiles.add(tileRenderable);
            return true;
        }
        return false;
    }

    private addCubeToLayerOnly(x: number, z: number, color: vec3 = this.hoverCubeColor): boolean {
        if (x >= 0 && x < this.globalState.divisionFactor && z >= 0 && z < this.globalState.divisionFactor) {
            let cubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.globalState.upperLeft[0] + this.globalState.sideLength * x,
                this.globalState.sideLength * this.currentLayer,
                this.globalState.upperLeft[1] + this.globalState.sideLength * z
            ));
            let cubeKey = this.getCubeString(x, z);
            let cubeColor = vec3.copy(vec3.create(), color);
            let cubeRenderable = new Renderable(this.cubeMesh, cubeColor, cubeModelMatrix);
            this.cubeLayer.set(cubeKey, cubeRenderable);
            return true;
        }
        return false;
    }

    addCube(x: number, z: number, color: vec3 = this.hoverCubeColor): boolean {
        if (this.addCubeToLayerOnly(x, z, color)) {
            let cubeColor = vec3.copy(vec3.create(), color);
            this.cubeSpace.setCube(x, this.currentLayer, z, cubeColor);
            return true;
        }
        return false;
    }

    deleteCube(x: number, z: number): boolean {
        if (x >= 0 && x < this.globalState.divisionFactor && z >= 0 && z < this.globalState.divisionFactor) {
            let cubeKey = this.getCubeString(x, z);
            if (this.cubeLayer.delete(cubeKey)) {
                this.cubeSpace.deleteCube(x, this.currentLayer, z);
                return true;
            }
        }
        return false;
    }

    toggleSun(): void {
        this.sunOn = !this.sunOn;
        this.sun.color = this.sunOn ? vec3.fromValues(1, 1, 1) : vec3.fromValues(0.1, 0.1, 0.1);
    }

    setSunCenter(position: vec3): void {
        this.sunCenter = position;
        this.sunCorner = vec3.subtract(vec3.create(), this.sunCenter,
            vec3.fromValues(this.globalState.sideLength / 2, this.globalState.sideLength / 2, this.globalState.sideLength / 2));
        this.sun.modelMatrix = mat4.fromTranslation(mat4.create(), this.sunCorner);
        this.sunSelection.modelMatrix = mat4.fromTranslation(mat4.create(), this.sunCorner);
    }
}