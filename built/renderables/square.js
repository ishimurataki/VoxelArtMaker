import Mesh from "./mesh.js";
import { vec3 } from "../gl-matrix/index.js";
export default class Square extends Mesh {
    constructor(glContext, sideLength = 1.0, color = vec3.fromValues(1.0, 0, 0)) {
        super();
        this.vertices = [
            0.0, 0.0, 0.0,
            sideLength, 0.0, 0.0,
            sideLength, 0.0, sideLength,
            0.0, 0.0, sideLength
        ];
        this.color = color;
        this.positionBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.positionBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(this.vertices), glContext.STATIC_DRAW);
        this.drawingMode = glContext.TRIANGLE_FAN;
    }
}
