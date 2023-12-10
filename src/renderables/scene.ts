import Renderable from "./renderable.js";
import Mesh from "./mesh.js";
import Grid from "./grid.js";
import Cube from "./cube.js";
import CubeSpace from "./cube_space.js";

import { vec2, vec3, mat4 } from "../gl-matrix/index.js";

export default class Scene {
    grid: Renderable;
    cubeLayer: Map<string, Renderable>;
    hoverCube: Renderable;
    hoverCubeColor: ReadonlyVec3;
    cubeSpace: CubeSpace;

    gl: WebGLRenderingContext;

    private gridMesh: Mesh;
    private cubeMesh: Mesh;
    private divisionFactor: number;
    private cubeSideLength: number;
    private upperLeft: vec2;

    private currentLayer = 0;

    constructor(gl: WebGLRenderingContext, divisionFactor: number, upperLeft: vec2, hoverCubeColor: vec3) {
        this.divisionFactor = divisionFactor;
        this.cubeSideLength = 1 / divisionFactor;
        this.upperLeft = upperLeft;

        this.gridMesh = new Grid(gl, divisionFactor);
        this.cubeMesh = new Cube(gl, this.cubeSideLength);

        let gridModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(upperLeft[0], 0, upperLeft[1]));
        this.grid = new Renderable(this.gridMesh, vec3.fromValues(0.3, 0.3, 0.3), gridModelMatrix);
        this.cubeLayer = new Map<string, Renderable>();

        this.hoverCubeColor = hoverCubeColor;
        this.hoverCube = new Renderable(this.cubeMesh, this.hoverCubeColor, mat4.create());
        this.setHoverCubePosition(0, 0);

        this.cubeSpace = new CubeSpace(gl, this.divisionFactor, this.upperLeft);

        this.gl = gl;
    }

    private getCubeString(x: number, z: number): string {
        return "cube_" + x + "_" + z;
    }

    setCubeLayer(y: number): void {
        if (y >= 0 && y < this.divisionFactor) {
            this.cubeLayer.clear();
            this.currentLayer = y;
            let yPad = y * Math.pow(this.divisionFactor, 2);
            for (let x = 0; x < this.divisionFactor; x++) {
                let xPad = x * this.divisionFactor;
                for (let z = 0; z < this.divisionFactor; z++) {
                    let cubeColor = this.cubeSpace.cubeSpace[yPad + xPad + z];
                    if (cubeColor != undefined) {
                        this.addCube(x, z, cubeColor)
                    }
                }
            }
            this.grid.modelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.upperLeft[0],
                this.currentLayer * this.cubeSideLength,
                this.upperLeft[1]));
        }
    }

    setHoverCubePosition(x: number, z: number): boolean {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let hoverCubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.upperLeft[0] + this.cubeSideLength * x,
                this.currentLayer * this.cubeSideLength,
                this.upperLeft[1] + this.cubeSideLength * z
            ));
            this.hoverCube.modelMatrix = hoverCubeModelMatrix;
            return true;
        }
        return false;
    }

    setHoverCubeColor(color: vec3) {
        this.hoverCubeColor = color;
    }

    addCube(x: number, z: number, color: vec3 = this.hoverCubeColor): boolean {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(
                this.upperLeft[0] + this.cubeSideLength * x,
                this.cubeSideLength * this.currentLayer,
                this.upperLeft[1] + this.cubeSideLength * z
            ));
            let cubeKey = this.getCubeString(x, z);
            let cubeColor = vec3.copy(vec3.create(), color);
            let cubeRenderable = new Renderable(this.cubeMesh, cubeColor, cubeModelMatrix);
            this.cubeLayer.set(cubeKey, cubeRenderable);
            this.cubeSpace.setCube(x, this.currentLayer, z, cubeColor);
            return true;
        }
        return false;
    }

    deleteCube(x: number, z: number): boolean {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeKey = this.getCubeString(x, z);
            if (this.cubeLayer.delete(cubeKey)) {
                this.cubeSpace.deleteCube(x, this.currentLayer, z);
                return true;
            }
        }
        return false;
    }
}