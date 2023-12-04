import Mesh from "./mesh.js";
import { vec3, mat4 } from "../gl-matrix/index.js";

export default class Renderable {
    mesh: Mesh;
    color: vec3;
    modelMatrix: mat4;

    constructor(mesh: Mesh, color: vec3, modelMatrix: mat4) {
        this.mesh = mesh;
        this.color = color;
        this.modelMatrix = modelMatrix;
    }

    setModelMatrix(modelMatrix: mat4): void {
        this.modelMatrix = modelMatrix;
    }
}