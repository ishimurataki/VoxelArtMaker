import Mesh from "./mesh.js";
export default class Cube extends Mesh {
    constructor(glContext, sideLength = 1.0) {
        super();
        this.vertices = [
            // Bottom face
            0.0, 0.0, 0.0,
            sideLength, 0.0, 0.0,
            sideLength, 0.0, sideLength,
            sideLength, 0.0, sideLength,
            0.0, 0.0, sideLength,
            0.0, 0.0, 0.0,
            // Top face
            0.0, sideLength, 0.0,
            sideLength, sideLength, 0.0,
            sideLength, sideLength, sideLength,
            sideLength, sideLength, sideLength,
            0.0, sideLength, sideLength,
            0.0, sideLength, 0.0,
            // Left face
            0.0, 0.0, 0.0,
            0.0, sideLength, 0.0,
            0.0, sideLength, sideLength,
            0.0, sideLength, sideLength,
            0.0, 0.0, sideLength,
            0.0, 0.0, 0.0,
            // Right face
            sideLength, 0.0, 0.0,
            sideLength, sideLength, 0.0,
            sideLength, sideLength, sideLength,
            sideLength, sideLength, sideLength,
            sideLength, 0.0, sideLength,
            sideLength, 0.0, 0.0,
            // Back face
            0.0, 0.0, 0.0,
            sideLength, 0.0, 0.0,
            sideLength, sideLength, 0.0,
            sideLength, sideLength, 0.0,
            0.0, sideLength, 0.0,
            0.0, 0.0, 0.0,
            // Front face
            0.0, 0.0, sideLength,
            sideLength, 0.0, sideLength,
            sideLength, sideLength, sideLength,
            sideLength, sideLength, sideLength,
            0.0, sideLength, sideLength,
            0.0, 0.0, sideLength,
        ];
        this.positionBuffer = glContext.createBuffer();
        glContext.bindBuffer(glContext.ARRAY_BUFFER, this.positionBuffer);
        glContext.bufferData(glContext.ARRAY_BUFFER, new Float32Array(this.vertices), glContext.STATIC_DRAW);
        this.drawingMode = glContext.TRIANGLES;
    }
}
