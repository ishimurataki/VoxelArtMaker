import initShaderProgram from "./utils/shader_helper.js";
import { flatVertexShaderSource, flatFragmentShaderSource } from "./shaders/flat_shader.js";
import { Mode, PolarCamera } from "./polar_camera.js";
import { vec2, vec3, mat4 } from "./gl-matrix/index.js";

import Scene from "./renderables/scene.js";

// GLOBAL VARIABLES DECLARATIONS
let CLIENT_WIDTH: number = 0;
let CLIENT_HEIGHT: number = 0;
let CANVAS: HTMLCanvasElement;
let LAYER_LABEL: Element;
let CAMERA = new PolarCamera(0, 0);
let VIEW_PROJECTION_INVERSE: mat4 = mat4.create();

let DIVISION_FACTOR = 32;
let SIDE_LENGTH = 1 / DIVISION_FACTOR;
let UPPER_LEFT: vec2 = vec2.fromValues(-0.5, -0.5);

let SCENE: Scene;
let RENDER_HOVER_CUBE = false;
let HOVER_CUBE_COLOR = vec3.fromValues(0.31372, 0.7843, 0.47059);
let LAYER = 0;

let TRANSITIONING: boolean = false;
let TRANSITION_TIME = 0;
let PREVIOUS_TIME = 0;

let BACKGROUND_COLOR = vec3.fromValues(0.15, 0.15, 0.15);

const registerControls = () => {
    let mouseDown = false;
    let shiftDown = false;
    let cubePlacedInCurrentPos = false;
    let xIndex = -1;
    let zIndex = -1;
    let movementSpeed = 0.01;
    let zoomSpeed = -0.008;
    let layerScrollSpeed = 0.005;

    const moveHandler = (e: MouseEvent) => {
        if (CAMERA.getMode() == Mode.Editor) {
            const rect = CANVAS.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const clipX = x / rect.width * 2 - 1;
            const clipY = y / rect.height * -2 + 1;

            const start: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, -1), VIEW_PROJECTION_INVERSE);
            const end: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, 1), VIEW_PROJECTION_INVERSE);

            const v: vec3 = vec3.sub(vec3.create(), end, start);
            const currentLayerY = Math.round(LAYER) / DIVISION_FACTOR;
            const t = (currentLayerY - start[1]) / v[1];

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
        } else if (CAMERA.getMode() == Mode.Viewer) {
            if (mouseDown) {
                console.log("MOVING CAMERA");
                let xMove = e.movementX * movementSpeed;
                let yMove = e.movementY * movementSpeed;
                CAMERA.rotateTheta(xMove);
                CAMERA.rotatePhi(yMove);
            }
        }
    }

    const mousewheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        if (CAMERA.getMode() == Mode.Viewer) {
            let zoom = zoomSpeed * e.deltaY;
            CAMERA.zoom(zoom);
        } else if (CAMERA.getMode() == Mode.Editor) {
            let prevLayer = Math.round(LAYER);
            let layerScroll = layerScrollSpeed * e.deltaY;
            LAYER = Math.min(DIVISION_FACTOR - 1, Math.max(0, LAYER - layerScroll));
            let currentLayer = Math.round(LAYER);
            if (prevLayer != currentLayer) {
                LAYER_LABEL.innerHTML = "Layer: " + currentLayer.toString();
                RENDER_HOVER_CUBE = false;
                console.log("Setting layer to: " + currentLayer);
                CAMERA.setEditorRef(vec3.fromValues(0.0, currentLayer / DIVISION_FACTOR, 0.0));
                TRANSITIONING = true;
                TRANSITION_TIME = 0;
                SCENE.setCubeLayer(currentLayer);
            }
        }
    }

    const clickHandler = (e: PointerEvent) => {
        if (CAMERA.getMode() == Mode.Editor) {
            if (shiftDown) {
                RENDER_HOVER_CUBE = false;
                SCENE.deleteCube(xIndex, zIndex);
            } else {
                SCENE.addCube(xIndex, zIndex);
            }
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
        }
    }

    const keyUpHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = false;
                break;
            case "Space":
                RENDER_HOVER_CUBE = false;
                TRANSITIONING = true;
                TRANSITION_TIME = 0;
                console.log("Toggling mode")
                if (CAMERA.getMode() == Mode.Editor) {
                    let yRange: vec2 = SCENE.cubeSpace.populateBuffers();
                    let viewerRefY = yRange[0] + yRange[1] / (2 * DIVISION_FACTOR);
                    CAMERA.setViewerRef(vec3.fromValues(0, viewerRefY, 0));
                    CAMERA.changeToViewer();
                } else if (CAMERA.getMode() == Mode.Viewer) {
                    CAMERA.changeToEditor();
                }
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
    CANVAS.addEventListener('wheel', mousewheelHandler, false);
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('coloris:pick', colorisPickHandler);
}

function main() {
    console.log("Starting main function.");

    const layerLabelMaybeNull: Element | null = document.getElementById("layerLabel");
    if (layerLabelMaybeNull == null) {
        alert("Couldn't find layer label element.");
        return;
    }
    LAYER_LABEL = layerLabelMaybeNull;

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
                color: gl.getUniformLocation(flatShaderProgram, 'uColor'),
                useUniformColor: gl.getUniformLocation(flatShaderProgram, 'uUseUniformColor'),
                cameraPosition: gl.getUniformLocation(flatShaderProgram, 'uCameraPosition')
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

    PREVIOUS_TIME = performance.now();

    function render(now: number) {
        tick(now);
        drawScene(gl);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    gl.enable(gl.DEPTH_TEST);

    function drawScene(gl: WebGLRenderingContext) {
        gl.clearColor(BACKGROUND_COLOR[0], BACKGROUND_COLOR[1], BACKGROUND_COLOR[2], 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let projectionMatrix = CAMERA.getProjMatrix();
        let modelViewMatrix = CAMERA.getViewMatrix();
        mat4.invert(VIEW_PROJECTION_INVERSE, CAMERA.getViewProj());

        gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniform3fv(programInfo.flatShader.uniformLocations.cameraPosition, CAMERA.getPosition());

        if (CAMERA.getMode() == Mode.Editor) {
            gl.uniform1i(programInfo.flatShader.uniformLocations.useUniformColor, 1);
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
        else if (CAMERA.getMode() == Mode.Viewer) {
            gl.uniform1i(programInfo.flatShader.uniformLocations.useUniformColor, 0);
            // Draw cube space
            gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.cubeSpace.cubeSpacePositionBuffer);
            gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.cubeSpace.cubeSpaceNormalBuffer);
            gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexNormal);
            gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.cubeSpace.cubeSpaceColorBuffer);
            gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexColor, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexColor);
            gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, mat4.create());
            gl.drawArrays(gl.TRIANGLES, 0, SCENE.cubeSpace.cubeSpaceNumberOfVertices);
            gl.disableVertexAttribArray(programInfo.flatShader.attribLocations.vertexNormal);
            gl.disableVertexAttribArray(programInfo.flatShader.attribLocations.vertexColor);
        }
    }
}

function tick(currentTime: number) {
    let deltaTime = currentTime - PREVIOUS_TIME;
    if (TRANSITIONING) {
        let a = TRANSITION_TIME / 1000;
        if (a > 1) {
            TRANSITIONING = false;
            TRANSITION_TIME = 0;
        }
        CAMERA.transition(a);
        TRANSITION_TIME += deltaTime;
    }
    PREVIOUS_TIME = currentTime;
}

window.onload = main;