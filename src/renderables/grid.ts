import Mesh from "./mesh.js";
import { vec3 } from "../gl-matrix/index.js";

export default class Grid extends Mesh {
    divisionFactor = 2;
    color = vec3.fromValues(1, 1, 1);

    constructor(glContext: WebGLRenderingContext, divisionFactor = 2) {
        super();
        this.divisionFactor = divisionFactor;
        for (let i = 0; i <= divisionFactor; i++) {
            let delta = i / divisionFactor;
            this.vertices.push(0.0, -0.001, delta);
            this.vertices.push(1.0, -0.001, delta);

            this.vertices.push(delta, -0.001, 1.0);
            this.vertices.push(delta, -0.001, 0.0);
        }

        let sideLength = 1 / divisionFactor;
        for (let i = 0; i <= divisionFactor; i++) {
            let delta = i / divisionFactor;
            this.vertices.push(0.0, sideLength + 0.001, delta);
            this.vertices.push(1.0, sideLength + 0.001, delta);

            this.vertices.push(delta, sideLength + 0.001, 1.0);
            this.vertices.push(delta, sideLength + 0.001, 0.0);
        }

        this.positionBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.positionBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(this.vertices), glContext.STATIC_DRAW);
        this.drawingMode = glContext.LINES;
    }
}