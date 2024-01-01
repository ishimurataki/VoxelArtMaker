import { vec2, mat4 } from "./gl-matrix/index.js";

export enum TracerMaterial {
    Diffuse,
    Mirror
}

export class GlobalState {
    canvas: HTMLCanvasElement;
    clientWidth: number;
    clientHeight: number;

    divisionFactor: number;
    sideLength: number;
    upperLeft: vec2;

    renderHoverCube: boolean = false;
    renderSunSelection: boolean = false;

    viewProjectionInverse: mat4 = mat4.create();

    transitioning: boolean = false;
    transitionTime: number = 0;
    previousTime: number = performance.now();

    rayTrace: boolean = false;
    sampleCount: number = 0;
    tracerMaterial: TracerMaterial = TracerMaterial.Diffuse;

    sunStrength: number = 0.75;
    ambienceStrength: number = 0.25;

    constructor(canvas: HTMLCanvasElement, divisionFactor: number, upperLeft: vec2) {
        this.canvas = canvas;
        this.clientWidth = canvas.clientWidth;
        this.clientHeight = canvas.clientHeight;
        this.divisionFactor = divisionFactor;
        this.sideLength = 1 / this.divisionFactor;
        this.upperLeft = upperLeft;
    }
}