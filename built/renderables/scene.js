import Renderable from "./renderable.js";
import Grid from "./grid.js";
import Square from "./square.js";
import Cube from "./cube.js";
import SelectionBox from "./selection_box.js";
import CubeSpace from "./cube_space.js";
import { vec3, mat4 } from "../gl-matrix/index.js";
export default class Scene {
    constructor(gl, divisionFactor, upperLeft, hoverCubeColor) {
        this.backgroundColor = vec3.fromValues(0.15, 0.15, 0.15);
        this.currentLayer = 0;
        this.divisionFactor = divisionFactor;
        this.cubeSideLength = 1 / divisionFactor;
        this.upperLeft = upperLeft;
        this.gridMesh = new Grid(gl, divisionFactor);
        this.squareMesh = new Square(gl, this.cubeSideLength);
        this.cubeMesh = new Cube(gl, this.cubeSideLength);
        this.selectionMesh = new SelectionBox(gl, this.cubeSideLength);
        let gridModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(upperLeft[0], 0, upperLeft[1]));
        this.grid = new Renderable(this.gridMesh, vec3.fromValues(0.3, 0.3, 0.3), gridModelMatrix);
        this.editorTiles = new Set();
        this.cubeLayer = new Map();
        this.hoverCubeColor = hoverCubeColor;
        this.hoverCube = new Renderable(this.cubeMesh, this.hoverCubeColor, mat4.create());
        this.setHoverCubePosition(0, 0);
        this.cubeSpace = new CubeSpace(gl, this.divisionFactor, this.upperLeft);
        this.sunOn = true;
        this.sun = new Renderable(this.cubeMesh, vec3.fromValues(1.0, 1.0, 1.0), mat4.create());
        this.sunSelection = new Renderable(this.selectionMesh, vec3.fromValues(1.0, 0.0, 0.0), mat4.create());
        this.setSunCenter(vec3.fromValues(0.0, 0.5, 0.0));
        this.gl = gl;
    }
    getCubeString(x, z) {
        return "cube_" + x + "_" + z;
    }
    setCubeLayer(y) {
        if (y >= 0 && y < this.divisionFactor) {
            this.editorTiles.clear();
            this.cubeLayer.clear();
            this.currentLayer = y;
            let yPad = y * Math.pow(this.divisionFactor, 2);
            let yBelowPad = (y - 1) * Math.pow(this.divisionFactor, 2);
            for (let x = 0; x < this.divisionFactor; x++) {
                let xPad = x * this.divisionFactor;
                for (let z = 0; z < this.divisionFactor; z++) {
                    let cubeColor = this.cubeSpace.cubeSpace[yPad + xPad + z];
                    if (cubeColor != undefined) {
                        this.addCubeToLayerOnly(x, z, cubeColor);
                    }
                    if (y >= 1) {
                        let cubeBelowColor = this.cubeSpace.cubeSpace[yBelowPad + xPad + z];
                        if (cubeBelowColor != undefined) {
                            this.addTile(x, z, cubeBelowColor);
                        }
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
    setBackgroundColor(color) {
        this.backgroundColor = color;
    }
    addTile(x, z, color) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let tileModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, this.cubeSideLength * this.currentLayer, this.upperLeft[1] + this.cubeSideLength * z));
            let tileColor = vec3.copy(vec3.create(), color);
            let tileRenderable = new Renderable(this.squareMesh, tileColor, tileModelMatrix);
            this.editorTiles.add(tileRenderable);
            return true;
        }
        return false;
    }
    addCubeToLayerOnly(x, z, color = this.hoverCubeColor) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeModelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(this.upperLeft[0] + this.cubeSideLength * x, this.cubeSideLength * this.currentLayer, this.upperLeft[1] + this.cubeSideLength * z));
            let cubeKey = this.getCubeString(x, z);
            let cubeColor = vec3.copy(vec3.create(), color);
            let cubeRenderable = new Renderable(this.cubeMesh, cubeColor, cubeModelMatrix);
            this.cubeLayer.set(cubeKey, cubeRenderable);
            return true;
        }
        return false;
    }
    addCube(x, z, color = this.hoverCubeColor) {
        if (this.addCubeToLayerOnly(x, z, color)) {
            let cubeColor = vec3.copy(vec3.create(), color);
            this.cubeSpace.setCube(x, this.currentLayer, z, cubeColor);
            return true;
        }
        return false;
    }
    deleteCube(x, z) {
        if (x >= 0 && x < this.divisionFactor && z >= 0 && z < this.divisionFactor) {
            let cubeKey = this.getCubeString(x, z);
            if (this.cubeLayer.delete(cubeKey)) {
                this.cubeSpace.deleteCube(x, this.currentLayer, z);
                return true;
            }
        }
        return false;
    }
    toggleSun() {
        this.sunOn = !this.sunOn;
        this.sun.color = this.sunOn ? vec3.fromValues(1, 1, 1) : vec3.fromValues(0.1, 0.1, 0.1);
    }
    setSunCenter(position) {
        this.sunCenter = position;
        this.sunCorner = vec3.subtract(vec3.create(), this.sunCenter, vec3.fromValues(this.cubeSideLength / 2, this.cubeSideLength / 2, this.cubeSideLength / 2));
        this.sun.modelMatrix = mat4.fromTranslation(mat4.create(), this.sunCorner);
        this.sunSelection.modelMatrix = mat4.fromTranslation(mat4.create(), this.sunCorner);
    }
}
