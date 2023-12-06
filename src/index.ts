import initShaderProgram from "./utils/shader_helper.js";
import { flatVertexShaderSource, flatFragmentShaderSource } from "./shaders/flat_shader.js";
import PolarCamera from "./polar_camera.js";
import { vec2, vec3, mat4 } from "./gl-matrix/index.js";

import Scene from "./renderables/scene.js";

// GLOBAL VARIABLES DECLARATIONS
let CLIENT_WIDTH: number = 0;
let CLIENT_HEIGHT: number = 0;
let CANVAS: HTMLCanvasElement;
let CAMERA = new PolarCamera(0, 0);
let VIEW_PROJECTION_INVERSE: mat4 = mat4.create();

let DIVISION_FACTOR = 64;
let SIDE_LENGTH = 1 / DIVISION_FACTOR;
let UPPER_LEFT: vec2 = vec2.fromValues(-0.5, -0.5);

let SCENE: Scene;
let RENDER_HOVER_CUBE = false;
let HOVER_CUBE_COLOR = vec3.fromValues(0.31372, 0.7843, 0.47059);

enum Mode {
    Editor,
    Viewer
}

let MODE: Mode = Mode.Editor;

const registerControls = () => {
    let mouseDown = false;
    let shiftDown = false;
    let cubePlacedInCurrentPos = false;
    let xIndex = -1;
    let zIndex = -1;

    const moveHandler = (e: MouseEvent) => {
        const rect = CANVAS.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clipX = x / rect.width * 2 - 1;
        const clipY = y / rect.height * -2 + 1;

        const start: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, -1), VIEW_PROJECTION_INVERSE);
        const end: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, 1), VIEW_PROJECTION_INVERSE);

        const v: vec3 = vec3.sub(vec3.create(), end, start);
        const t = -start[1] / v[1];

        let cursorXWorld = start[0] + t * v[0];
        let cursorZWorld = start[2] + t * v[2];

        let xIndexNow = Math.floor((cursorXWorld - UPPER_LEFT[0]) / SIDE_LENGTH);
        let zIndexNow = Math.floor((cursorZWorld - UPPER_LEFT[1]) / SIDE_LENGTH);

        if (xIndexNow != xIndex || zIndexNow != zIndex) {
            RENDER_HOVER_CUBE = SCENE.setHoverCubePosition(xIndexNow, zIndexNow);
            cubePlacedInCurrentPos = false;
            xIndex = xIndexNow;
            zIndex = zIndexNow;
        }
        if (mouseDown && !cubePlacedInCurrentPos) {
            if (shiftDown) {
                RENDER_HOVER_CUBE = false;
                SCENE.deleteCube(xIndex, zIndex);
            } else {
                SCENE.addCube(xIndex, zIndex);
            }
            cubePlacedInCurrentPos = true;
        }
    }

    const clickHandler = (e: PointerEvent) => {
        if (shiftDown) {
            RENDER_HOVER_CUBE = false;
            SCENE.deleteCube(xIndex, zIndex);
        } else {
            SCENE.addCube(xIndex, zIndex);
        }
    }

    const mouseDownHandler = (e: MouseEvent) => {
        mouseDown = true;
    }

    const mouseUpHandler = (e: MouseEvent) => {
        mouseDown = false;
    }

    const keyDownHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = true;
                break;
            case "Space":
                console.log("Toggling mode")
                if (MODE == Mode.Editor) {
                    SCENE.createCubeSpace();
                    MODE = Mode.Viewer;
                } else {
                    MODE = Mode.Editor;
                }
        }
    }

    const keyUpHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = false;
        }
    }

    const colorisPickHandler = (e: any) => {
        let rgbString = e.detail.color;
        let rgbArray = rgbString.slice(
            rgbString.indexOf("(") + 1,
            rgbString.indexOf(")")
        ).split(", ");
        HOVER_CUBE_COLOR[0] = rgbArray[0] / 255;
        HOVER_CUBE_COLOR[1] = rgbArray[1] / 255;
        HOVER_CUBE_COLOR[2] = rgbArray[2] / 255;
        SCENE.setHoverCubeColor(HOVER_CUBE_COLOR);
    }

    CANVAS.addEventListener('mousemove', moveHandler, false);
    CANVAS.addEventListener('click', clickHandler, false);
    CANVAS.addEventListener('mousedown', mouseDownHandler, false);
    CANVAS.addEventListener('mouseup', mouseUpHandler, false);
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('coloris:pick', colorisPickHandler);
}

function main() {
    console.log("Starting main function.");

    const canvasMaybeNull: HTMLCanvasElement | null = document.querySelector("#glCanvas");
    if (canvasMaybeNull == null) {
        alert("Couldn't find canvas element.");
        return;
    }
    CANVAS = canvasMaybeNull;

    CLIENT_WIDTH = CANVAS.clientWidth;
    CLIENT_HEIGHT = CANVAS.clientHeight;

    CANVAS.width = CLIENT_WIDTH;
    CANVAS.height = CLIENT_HEIGHT;

    const glMaybeNull: WebGLRenderingContext | null = CANVAS.getContext("webgl");
    if (glMaybeNull == null) {
        alert("Unable to initialize WebGL context. Your browser or machine may not support it.");
        return;
    }
    const gl: WebGLRenderingContext = glMaybeNull;

    const flatShaderProgram: WebGLShader | null = initShaderProgram(gl, flatVertexShaderSource, flatFragmentShaderSource);
    if (flatShaderProgram == null) {
        alert("Could not compile flat shader program");
        return;
    }

    const programInfo = {
        flatShader: {
            program: flatShaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(flatShaderProgram, 'aVertexPosition'),
                vertexColor: gl.getAttribLocation(flatShaderProgram, 'aVertexColor'),
                vertexNormal: gl.getAttribLocation(flatShaderProgram, 'aVertexNormal'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(flatShaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(flatShaderProgram, 'uModelViewMatrix'),
                modelMatrix: gl.getUniformLocation(flatShaderProgram, 'uModelMatrix'),
                color: gl.getUniformLocation(flatShaderProgram, 'uColor')
            }
        }
    }

    window.addEventListener('resize', () => {

        const CLIENT_WIDTH = CANVAS.clientWidth;
        const CLIENT_HEIGHT = CANVAS.clientHeight;

        const needResize = CANVAS.width !== CLIENT_WIDTH || CANVAS.height !== CLIENT_HEIGHT;

        if (needResize) {
            console.log("Resizing canvas");
            CANVAS.width = CLIENT_WIDTH;
            CANVAS.height = CLIENT_HEIGHT;

            CAMERA.changeWidthHeight(CLIENT_WIDTH, CLIENT_HEIGHT);

            let projectionMatrix = CAMERA.getProjMatrix();

            gl.useProgram(programInfo.flatShader.program);
            gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.projectionMatrix, false, projectionMatrix);

            mat4.invert(VIEW_PROJECTION_INVERSE, CAMERA.getViewProj());
            gl.viewport(0, 0, CLIENT_WIDTH, CLIENT_HEIGHT);
        }
    });

    CAMERA.changeWidthHeight(CLIENT_WIDTH, CLIENT_HEIGHT);

    gl.viewport(0, 0, CLIENT_WIDTH, CLIENT_HEIGHT);

    let projectionMatrix = CAMERA.getProjMatrix();
    let modelViewMatrix = CAMERA.getViewMatrix();
    mat4.invert(VIEW_PROJECTION_INVERSE, CAMERA.getViewProj());

    registerControls();

    gl.useProgram(programInfo.flatShader.program);
    gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    SCENE = new Scene(gl, DIVISION_FACTOR, UPPER_LEFT, HOVER_CUBE_COLOR);

    function render(now: number) {
        drawScene(gl);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    gl.enable(gl.DEPTH_TEST);

    function drawScene(gl: WebGLRenderingContext) {
        gl.clearColor(0.15, 0.15, 0.15, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (MODE == Mode.Editor) {
            // Draw cubes
            let firstCube = true
            for (let cube of SCENE.cubeLayer.values()) {
                if (firstCube) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, cube.mesh.positionBuffer);
                    gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
                    firstCube = false;
                }
                gl.uniform3fv(programInfo.flatShader.uniformLocations.color, cube.color);
                gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, cube.modelMatrix);
                gl.drawArrays(cube.mesh.drawingMode, 0, cube.mesh.vertices.length / 3);
            }

            // Draw hover cube
            if (RENDER_HOVER_CUBE) {
                if (firstCube) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.hoverCube.mesh.positionBuffer);
                    gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
                }
                gl.uniform3fv(programInfo.flatShader.uniformLocations.color, SCENE.hoverCube.color);
                gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, SCENE.hoverCube.modelMatrix);
                gl.drawArrays(SCENE.hoverCube.mesh.drawingMode, 0, SCENE.hoverCube.mesh.vertices.length / 3);
            }

            // Draw grid
            gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.grid.mesh.positionBuffer);
            gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
            gl.uniform3fv(programInfo.flatShader.uniformLocations.color, SCENE.grid.color);
            gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, SCENE.grid.modelMatrix);
            gl.drawArrays(SCENE.grid.mesh.drawingMode, 0, SCENE.grid.mesh.vertices.length / 3);
        }
        else if (MODE == Mode.Viewer) {
            // Draw cube space
            gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.cubeSpacePositionBuffer);
            gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
            gl.uniform3fv(programInfo.flatShader.uniformLocations.color, vec3.fromValues(1.0, 0.0, 0.0));
            gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, mat4.create());
            gl.drawArrays(gl.TRIANGLES, 0, SCENE.cubeSpaceNumberOfVertices / 3);
        }
    }
}

window.onload = main;