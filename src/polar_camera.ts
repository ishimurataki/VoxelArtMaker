import { vec3, vec4, mat4 } from "./gl-matrix/index.js"

export default class PolarCamera {
    fovy: number = 45.0 * Math.PI / 180;
    width: number;
    height: number;
    nearClip: number = 0.1;
    farClip: number = 100;

    eye: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
    ref: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
    up: vec3 = vec3.fromValues(0.0, 0.0, -1.0);

    theta: number = 0;                // theta ranges from 0 to 2pi
    phi: number = 0.5 * Math.PI;   // phi ranges from 0 to pi
    r: number = 1.5;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    changeWidthHeight(w: number, h: number): void {
        this.width = w;
        this.height = h;
    }

    getPosition(): vec3 {
        return this.eye;
    }

    setRef(r: vec3) {
        this.ref = r;
    }

    getViewMatrix(): mat4 {
        let viewMatrix = mat4.create();
        let viewMatrixInverse = mat4.create();
        let t = this.r * Math.cos(this.phi);

        this.eye[0] = t * Math.cos(this.theta) + this.ref[0];
        this.eye[1] = this.r * Math.sin(this.phi) + this.ref[1];
        this.eye[2] = t * Math.sin(this.theta) + this.ref[2];

        mat4.targetTo(viewMatrix, this.eye, this.ref, this.up);
        mat4.invert(viewMatrixInverse, viewMatrix);
        return viewMatrixInverse;
    }

    getProjMatrix(): mat4 {
        let projMatrix = mat4.create();
        mat4.perspective(projMatrix, this.fovy,
            this.width / this.height,
            this.nearClip, this.farClip);
        return projMatrix;
    }

    getViewProj(): mat4 {
        let projMatrix = this.getProjMatrix();
        let viewMatrix = this.getViewMatrix();
        let viewProjMatrix = mat4.create();

        mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);
        return viewProjMatrix;
    }

    rotateTheta(rad: number): void {
        this.theta += rad;
        this.theta %= 2 * Math.PI;
    }

    rotatePhi(rad: number): void {
        this.phi += rad;
        if (this.phi > (1 / 2) * Math.PI - 0.01) this.phi = (1 / 2) * Math.PI - 0.01;
        if (this.phi < (-1 / 2) * Math.PI + 0.01) this.phi = (-1 / 2) * Math.PI + 0.01;
    }

    zoom(amt: number): void {
        this.r += amt * this.r * 0.1;
    }

    reset(): void {
        this.theta = 0;
        this.phi = (1 / 2) * Math.PI;
        this.r = 50;

        this.ref = vec3.fromValues(0.0, 0.0, 0.0);
        this.up = vec3.fromValues(0.0, 1.0, 0.0);
    }

    debug(): void {
        console.log('Eye: ' + this.eye);
        console.log('Up: ' + this.up);
    }
}