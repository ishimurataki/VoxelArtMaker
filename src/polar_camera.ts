import { vec3, vec4, mat4 } from "./gl-matrix/index.js"

enum Mode {
    Editor,
    Viewer
}

class PolarCamera {
    fovy: number = 45.0 * Math.PI / 180;
    width: number;
    height: number;
    nearClip: number = 0.1;
    farClip: number = 100;

    eye: vec3 = vec3.fromValues(0.0, 1.0, 0.0);
    ref: vec3 = vec3.fromValues(0.0, 0.0, 0.0);
    up: vec3 = vec3.fromValues(0.0, 1.0, 0.0);

    theta: number = 0;                // theta ranges from 0 to 2pi
    phi: number = 0.5 * Math.PI;   // phi ranges from 0 to pi
    r: number = 1.5;

    private mode: Mode = Mode.Editor;

    private editorRef = vec3.fromValues(0.0, 0.0, 0.0);
    private readonly EDITOR_THETA: number = 0;
    private readonly EDITOR_PHI: number = 0.499 * Math.PI;
    private readonly EDITOR_R: number = 1.5;

    private viewerRef = vec3.fromValues(0.0, 0.0, 0.0);
    private viewerTheta: number = 0.25 * Math.PI;
    private viewerPhi: number = 0.15 * Math.PI;
    private viewerR: number = 1.5;

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
        if (this.mode == Mode.Viewer) {
            this.theta += rad;
            this.theta %= 2 * Math.PI;
            this.viewerTheta = this.theta;
        }
    }

    rotatePhi(rad: number): void {
        if (this.mode == Mode.Viewer) {
            this.phi += rad;
            if (this.phi > (1 / 2) * Math.PI - 0.01) this.phi = (1 / 2) * Math.PI - 0.01;
            if (this.phi < (-1 / 2) * Math.PI + 0.01) this.phi = (-1 / 2) * Math.PI + 0.01;
            this.viewerPhi = this.phi;
        }
    }

    zoom(amt: number): void {
        if (this.mode == Mode.Viewer) {
            this.r += amt * this.r * 0.1;
            this.viewerR = this.r;
        }
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

    getMode(): Mode {
        return this.mode;
    }

    changeToViewer(): void {
        this.mode = Mode.Viewer;
    }

    changeToEditor(): void {
        this.mode = Mode.Editor;
    }

    setEditorRef(ref: vec3): void {
        this.editorRef = ref;
    }

    setViewerRef(ref: vec3): void {
        this.viewerRef = ref;
    }

    transition(a: number): void {
        a = Math.min(1, Math.max(0, a));
        let refDesired: vec3 = this.editorRef;
        let rDesired: number = 0;
        let thetaDesired: number = 0;
        let phiDesired: number = 0;
        if (this.mode == Mode.Editor) {
            refDesired = this.editorRef;
            rDesired = this.EDITOR_R;
            thetaDesired = this.EDITOR_THETA;
            phiDesired = this.EDITOR_PHI;
        } else if (this.mode == Mode.Viewer) {
            refDesired = this.viewerRef;
            rDesired = this.viewerR;
            thetaDesired = this.viewerTheta;
            phiDesired = this.viewerPhi;
        }
        let x = vec3.scale(vec3.create(), this.ref, (1 - a));
        let y = vec3.scale(vec3.create(), refDesired, a);
        this.setRef(vec3.add(vec3.create(), x, y));
        this.r = this.r * (1 - a) + rDesired * a;
        this.theta = this.theta * (1 - a) + thetaDesired * a;
        this.phi = this.phi * (1 - a) + phiDesired * a;
    }
}

export { Mode, PolarCamera };