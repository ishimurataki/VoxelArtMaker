import Mesh from "./mesh.js";
export default class Square extends Mesh {
    constructor(glContext, sideLength = 1.0) {
        super();
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
        this.drawingMode = glContext.TRIANGLE_FAN;
    }
}
