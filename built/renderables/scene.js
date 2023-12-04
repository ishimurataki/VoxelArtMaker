import Renderable from "./renderable.js";
import Grid from "./grid.js";
import Cube from "./cube.js";
import { vec3, mat4 } from "../gl-matrix/index.js";
export default class Scene {
    constructor(gl, divisionFactor, upperLeft, hoverCubeColor) {
        this.divisionFactor = divisionFactor;
        this.cubeSideLength = 1 / divisionFactor;
        this.upperLeft = upperLeft;
        this.gridMesh = new Grid(gl, divisionFactor);
        this.cubeMesh = new Cube(gl, this.cubeSideLength);
        let gridModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(upperLeft[0], 0, upperLeft[1]));
        this.grid = new Renderable(this.gridMesh, vec3.fromValues(0.3, 0.3, 0.3), gridModelMatrix);
        this.cubes = new Map();
        this.hoverCubeColor = hoverCubeColor;
        this.hoverCube = new Renderable(this.cubeMesh, this.hoverCubeColor, mat4.create());
        this.setHoverCubePosition(0, 0);
    }
    getCubeString(x, z) {
        return "cube_" + x + "_" + z;
    }
    setHoverCubePosition(x, z) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let hoverCubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, -this.cubeSideLength, this.upperLeft[1] + this.cubeSideLength * z));
            this.hoverCube.modelMatrix = hoverCubeModelMatrix;
            return true;
        }
        return false;
    }
    setHoverCubeColor(color) {
        this.hoverCubeColor = color;
    }
    addCube(x, z) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, -this.cubeSideLength, this.upperLeft[1] + this.cubeSideLength * z));
            let cubeKey = this.getCubeString(x, z);
            let cubeRenderable = new Renderable(this.cubeMesh, this.hoverCubeColor, cubeModelMatrix);
            this.cubes.set(cubeKey, cubeRenderable);
            return true;
        }
        return false;
    }
    deleteCube(x, z) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeKey = this.getCubeString(x, z);
            return this.cubes.delete(cubeKey);
        }
        return false;
    }
}
