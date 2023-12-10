import Renderable from "./renderable.js";
import Grid from "./grid.js";
import Cube from "./cube.js";
import CubeSpace from "./cube_space.js";
import { vec3, mat4 } from "../gl-matrix/index.js";
export default class Scene {
    constructor(gl, divisionFactor, upperLeft, hoverCubeColor) {
        this.currentLayer = 0;
        this.divisionFactor = divisionFactor;
        this.cubeSideLength = 1 / divisionFactor;
        this.upperLeft = upperLeft;
        this.gridMesh = new Grid(gl, divisionFactor);
        this.cubeMesh = new Cube(gl, this.cubeSideLength);
        let gridModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(upperLeft[0], 0, upperLeft[1]));
        this.grid = new Renderable(this.gridMesh, vec3.fromValues(0.3, 0.3, 0.3), gridModelMatrix);
        this.cubeLayer = new Map();
        this.hoverCubeColor = hoverCubeColor;
        this.hoverCube = new Renderable(this.cubeMesh, this.hoverCubeColor, mat4.create());
        this.setHoverCubePosition(0, 0);
        this.cubeSpace = new CubeSpace(gl, this.divisionFactor, this.upperLeft);
        this.gl = gl;
    }
    getCubeString(x, z) {
        return "cube_" + x + "_" + z;
    }
    setCubeLayer(y) {
        if (y >= 0 && y < this.divisionFactor) {
            this.cubeLayer.clear();
            this.currentLayer = y;
            let yPad = y * Math.pow(this.divisionFactor, 2);
            for (let x = 0; x < this.divisionFactor; x++) {
                let xPad = x * this.divisionFactor;
                for (let z = 0; z < this.divisionFactor; z++) {
                    let cubeColor = this.cubeSpace.cubeSpace[yPad + xPad + z];
                    if (cubeColor != undefined) {
                        this.addCube(x, z, cubeColor);
                    }
                }
            }
            this.grid.modelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0], this.currentLayer * this.cubeSideLength, this.upperLeft[1]));
        }
    }
    setHoverCubePosition(x, z) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let hoverCubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, this.currentLayer * this.cubeSideLength, this.upperLeft[1] + this.cubeSideLength * z));
            this.hoverCube.modelMatrix = hoverCubeModelMatrix;
            return true;
        }
        return false;
    }
    setHoverCubeColor(color) {
        this.hoverCubeColor = color;
    }
    addCube(x, z, color = this.hoverCubeColor) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, this.cubeSideLength * this.currentLayer, this.upperLeft[1] + this.cubeSideLength * z));
            let cubeKey = this.getCubeString(x, z);
            let cubeColor = vec3.copy(vec3.create(), color);
            let cubeRenderable = new Renderable(this.cubeMesh, cubeColor, cubeModelMatrix);
            this.cubeLayer.set(cubeKey, cubeRenderable);
            this.cubeSpace.setCube(x, this.currentLayer, z, cubeColor);
            return true;
        }
        return false;
    }
    deleteCube(x, z) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeKey = this.getCubeString(x, z);
            return this.cubeLayer.delete(cubeKey);
        }
        return false;
    }
}
