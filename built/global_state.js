import { mat4 } from "./gl-matrix/index.js";
export var TracerMaterial;
(function (TracerMaterial) {
    TracerMaterial[TracerMaterial["Diffuse"] = 0] = "Diffuse";
    TracerMaterial[TracerMaterial["Mirror"] = 1] = "Mirror";
})(TracerMaterial || (TracerMaterial = {}));
export class GlobalState {
    constructor(canvas, divisionFactor, upperLeft) {
        this.renderHoverCube = false;
        this.renderSunSelection = false;
        this.viewProjectionInverse = mat4.create();
        this.transitioning = false;
        this.transitionTime = 0;
        this.previousTime = performance.now();
        this.rayTrace = false;
        this.sampleCount = 0;
        this.tracerMaterial = TracerMaterial.Diffuse;
        this.sunStrength = 0.75;
        this.ambienceStrength = 0.25;
        this.canvas = canvas;
        this.divisionFactor = divisionFactor;
        this.sideLength = 1 / this.divisionFactor;
        this.upperLeft = upperLeft;
    }
}
