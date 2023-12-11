import Mesh from "./mesh.js";
import { vec3 } from "../gl-matrix/index.js";

export default class Square extends Mesh {
    constructor(glContext: WebGLRenderingContext, sideLength = 1.0) {
        super();
        // this.vertices = [
        //     0.0, 0.0, 0.0,
        //     sideLength, 0.0, 0.0,
        //     sideLength, 0.0, sideLength,
        //     0.0, 0.0, sideLength
        // ];
        let p0 = sideLength * 0.2;
        let p1 = sideLength * 0.8;
        this.vertices = [
            p0, p0, p0,
            p1, p0, p0,
            p1, p0, p1,
            p0, p0, p1
        ];
        this.positionBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.positionBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(this.vertices), glContext.STATIC_DRAW);
        this.drawingMode = glContext.TRIANGLE_FAN
    }
}