import { vec3, mat4 } from "./gl-matrix/index.js";
var Mode;
(function (Mode) {
    Mode[Mode["Editor"] = 0] = "Editor";
    Mode[Mode["Viewer"] = 1] = "Viewer";
})(Mode || (Mode = {}));
class PolarCamera {
    constructor(width, height) {
        this.fovy = 45.0 * Math.PI / 180;
        this.nearClip = 0.1;
        this.farClip = 100;
        this.eye = vec3.fromValues(0.0, 1.0, 0.0);
        this.ref = vec3.fromValues(0.0, 0.0, 0.0);
        this.up = vec3.fromValues(0.0, 1.0, 0.0);
        this.theta = 0; // theta ranges from 0 to 2pi
        this.phi = 0.5 * Math.PI; // phi ranges from 0 to pi
        this.r = 1.5;
        this.mode = Mode.Editor;
        this.editorRef = vec3.fromValues(0.0, 0.0, 0.0);
        this.EDITOR_THETA = 0;
        this.EDITOR_PHI = 0.499 * Math.PI;
        this.EDITOR_R = 1.5;
        this.viewerRef = vec3.fromValues(0.0, 0.0, 0.0);
        this.viewerTheta = 0.25 * Math.PI;
        this.viewerPhi = 0.15 * Math.PI;
        this.viewerR = 1.5;
        this.width = width;
        this.height = height;
    }
    changeWidthHeight(w, h) {
        this.width = w;
        this.height = h;
    }
    getPosition() {
        return this.eye;
    }
    setRef(r) {
        this.ref = r;
    }
    getViewMatrix() {
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
    getProjMatrix() {
        let projMatrix = mat4.create();
        mat4.perspective(projMatrix, this.fovy, this.width / this.height, this.nearClip, this.farClip);
        return projMatrix;
    }
    getViewProj() {
        let projMatrix = this.getProjMatrix();
        let viewMatrix = this.getViewMatrix();
        let viewProjMatrix = mat4.create();
        mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);
        return viewProjMatrix;
    }
    rotateTheta(rad) {
        if (this.mode == Mode.Viewer) {
            this.theta += rad;
            this.theta %= 2 * Math.PI;
            this.viewerTheta = this.theta;
        }
    }
    rotatePhi(rad) {
        if (this.mode == Mode.Viewer) {
            this.phi += rad;
            if (this.phi > (1 / 2) * Math.PI - 0.01)
                this.phi = (1 / 2) * Math.PI - 0.01;
            if (this.phi < (-1 / 2) * Math.PI + 0.01)
                this.phi = (-1 / 2) * Math.PI + 0.01;
            this.viewerPhi = this.phi;
        }
    }
    zoom(amt) {
        if (this.mode == Mode.Viewer) {
            this.r += amt * this.r * 0.1;
            this.viewerR = this.r;
        }
    }
    reset() {
        this.theta = 0;
        this.phi = (1 / 2) * Math.PI;
        this.r = 50;
        this.ref = vec3.fromValues(0.0, 0.0, 0.0);
        this.up = vec3.fromValues(0.0, 1.0, 0.0);
    }
    debug() {
        console.log('Eye: ' + this.eye);
        console.log('Up: ' + this.up);
    }
    getMode() {
        return this.mode;
    }
    changeToViewer() {
        this.mode = Mode.Viewer;
    }
    changeToEditor() {
        this.mode = Mode.Editor;
    }
    setEditorRef(ref) {
        this.editorRef = ref;
    }
    setViewerRef(ref) {
        this.viewerRef = ref;
    }
    transition(a) {
        a = Math.min(1, Math.max(0, a));
        let refDesired = this.editorRef;
        let rDesired = 0;
        let thetaDesired = 0;
        let phiDesired = 0;
        if (this.mode == Mode.Editor) {
            refDesired = this.editorRef;
            rDesired = this.EDITOR_R;
            thetaDesired = this.EDITOR_THETA;
            phiDesired = this.EDITOR_PHI;
        }
        else if (this.mode == Mode.Viewer) {
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
