import { mat4 } from "./gl-matrix/index.js";
export default class GlobalState {
    constructor(canvas, divisionFactor, upperLeft) {
        this.renderHoverCube = false;
        this.renderSunSelection = false;
        this.viewProjectionInverse = mat4.create();
        this.transitioning = false;
        this.transitionTime = 0;
        this.previousTime = performance.now();
        this.rayTrace = false;
        this.canvas = canvas;
        this.clientWidth = canvas.clientWidth;
        this.clientHeight = canvas.clientHeight;
        this.divisionFactor = divisionFactor;
        this.sideLength = 1 / this.divisionFactor;
        this.upperLeft = upperLeft;
    }
}
