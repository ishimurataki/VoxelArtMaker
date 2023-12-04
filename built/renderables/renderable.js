export default class Renderable {
    constructor(mesh, color, modelMatrix) {
        this.mesh = mesh;
        this.color = color;
        this.modelMatrix = modelMatrix;
    }
    setModelMatrix(modelMatrix) {
        this.modelMatrix = modelMatrix;
    }
}
