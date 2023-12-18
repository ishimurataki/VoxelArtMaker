import Mesh from "./mesh.js";
import { vec3 } from "../gl-matrix/index.js";

export default class SelectionBox extends Mesh {

    constructor(glContext: WebGLRenderingContext, sideLength: number) {
        super();
        let v1 = [0.0, 0.0, 0.0];
        let v2 = [sideLength, 0.0, 0.0];
        let v3 = [sideLength, 0.0, sideLength];
        let v4 = [0.0, 0.0, sideLength];
        let v5 = [0.0, sideLength, 0.0];
        let v6 = [sideLength, sideLength, 0.0];
        let v7 = [sideLength, sideLength, sideLength];
        let v8 = [0.0, sideLength, sideLength];

        this.vertices.push(
            ...v1, ...v2,
            ...v2, ...v3,
            ...v3, ...v4,
            ...v4, ...v1,
            ...v5, ...v6,
            ...v6, ...v7,
            ...v7, ...v8,
            ...v8, ...v5,
            ...v1, ...v5,
            ...v2, ...v6,
            ...v3, ...v7,
            ...v4, ...v8
        );
        this.positionBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.positionBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(this.vertices), glContext.STATIC_DRAW);
        this.drawingMode = glContext.LINES;
    }
}