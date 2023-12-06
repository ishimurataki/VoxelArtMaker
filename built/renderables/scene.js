import Renderable from "./renderable.js";
import Grid from "./grid.js";
import Cube from "./cube.js";
import { vec3, mat4 } from "../gl-matrix/index.js";
export default class Scene {
    constructor(gl, divisionFactor, upperLeft, hoverCubeColor) {
        this.cubeSpaceNumberOfVertices = 0;
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
        this.cubeSpace = new Array(Math.pow(divisionFactor, 3));
        this.cubeSpace.fill(undefined);
        this.gl = gl;
    }
    getCubeString(x, z) {
        return "cube_" + x + "_" + z;
    }
    getCubeInSpaceIndex(x, y, z) {
        return (y * Math.pow(this.divisionFactor, 2)) + (x * this.divisionFactor) + z;
    }
    getCubeInSpace(x, y, z) {
        return this.cubeSpace[this.getCubeInSpaceIndex(x, y, z)];
    }
    setCubeInSpace(x, y, z, color) {
        this.cubeSpace[this.getCubeInSpaceIndex(x, y, z)] = color;
    }
    createCubeSpace() {
        let vertices = [];
        let colors = [];
        let xStart = this.upperLeft[0];
        let zStart = this.upperLeft[1];
        // bottom plane
        for (let x = 0; x < this.divisionFactor; x++) {
            let xPad = this.divisionFactor * x;
            let xWorldSpace = xStart + x * this.cubeSideLength;
            let xNextWorldSpace = xStart + (x + 1) * this.cubeSideLength;
            for (let z = 0; z < this.divisionFactor; z++) {
                let zWorldSpace = zStart + z * this.cubeSideLength;
                let zNextWorldSpace = zStart + (z + 1) * this.cubeSideLength;
                let cubeColor = this.cubeSpace[xPad + z];
                if (cubeColor != undefined) {
                    vertices.push(xWorldSpace, -3.0, zWorldSpace, xWorldSpace, -3.0, zNextWorldSpace, xNextWorldSpace, -3.0, zNextWorldSpace, xNextWorldSpace, -3.0, zNextWorldSpace, xNextWorldSpace, -3.0, zWorldSpace, xWorldSpace, -3.0, zWorldSpace);
                    for (let i = 0; i < 6; i++) {
                        colors.push(cubeColor[0], cubeColor[1], cubeColor[2]);
                    }
                }
            }
        }
        this.cubeSpacePositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeSpacePositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.cubeSpaceColorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeSpaceColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.cubeSpaceNumberOfVertices = vertices.length;
    }
    setCubeLayer(y) {
        this.cubeLayer.clear();
        let yPad = y * Math.pow(this.divisionFactor, 2);
        for (let x = 0; x < this.divisionFactor; x++) {
            let xPad = x * this.divisionFactor;
            for (let z = 0; z < this.divisionFactor; z++) {
                let cubeColor = this.cubeSpace[yPad + xPad + z];
                if (cubeColor != undefined) {
                    this.addCube(x, z, cubeColor);
                }
            }
        }
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
    addCube(x, z, color = this.hoverCubeColor) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, -this.cubeSideLength, this.upperLeft[1] + this.cubeSideLength * z));
            let cubeKey = this.getCubeString(x, z);
            let cubeColor = vec3.copy(vec3.create(), color);
            let cubeRenderable = new Renderable(this.cubeMesh, cubeColor, cubeModelMatrix);
            this.cubeLayer.set(cubeKey, cubeRenderable);
            this.setCubeInSpace(x, 0, z, cubeColor);
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
