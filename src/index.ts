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
let RENDER_SUN_SELECTION = false;
let MOVE_SUN = false;
let HOVER_CUBE_COLOR = vec3.fromValues(0.31372, 0.7843, 0.47059);
let LAYER = 0;

let TRANSITIONING: boolean = false;
let TRANSITION_TIME = 0;
let PREVIOUS_TIME = 0;

const registerControls = () => {
    let mouseDown = false;
    let shiftDown = false;
    let cubePlacedInCurrentPos = false;
    let xIndex = -1;
    let zIndex = -1;
    let movementSpeed = 0.01;
    let zoomSpeed = -0.008;
    let layerScrollSpeed = 0.005;
    enum COLOR_MODE {
        CUBE,
        BACKGROUND
    };
    let colorMode = COLOR_MODE.CUBE;

    const moveHandler = (e: MouseEvent) => {
        const rect = CANVAS.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clipX = x / rect.width * 2 - 1;
        const clipY = y / rect.height * -2 + 1;

        const start: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, -1), VIEW_PROJECTION_INVERSE);
        const end: vec3 = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, 1), VIEW_PROJECTION_INVERSE);

        const v: vec3 = vec3.sub(vec3.create(), end, start);
        if (CAMERA.getMode() == Mode.Editor) {

            let currentLayerY = Math.round(LAYER) / DIVISION_FACTOR;
            let t = (currentLayerY - start[1]) / v[1];

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
            // Detect if curser is over sun box
            let sunHit = false;
            for (let i = 0; i < 3; i++) {
                let t = (SCENE.sunCorner[i] - start[i]) / v[i];
                let dim1 = (i + 1) % 3;
                let dim2 = (i + 2) % 3;
                let dim1Value = start[dim1] + t * v[dim1];
                let dim2Value = start[dim2] + t * v[dim2];
                let dim1FromSun = dim1Value - SCENE.sunCorner[dim1];
                let dim2FromSun = dim2Value - SCENE.sunCorner[dim2];
                if (dim1FromSun >= 0 && dim1FromSun <= SIDE_LENGTH && dim2FromSun >= 0 && dim2FromSun <= SIDE_LENGTH) {
                    sunHit = true;
                    break;
                }
                t = (SCENE.sunCorner[i] + SIDE_LENGTH - start[i]) / v[i];
                dim1Value = start[dim1] + t * v[dim1];
                dim2Value = start[dim2] + t * v[dim2];
                dim1FromSun = dim1Value - SCENE.sunCorner[dim1];
                dim2FromSun = dim2Value - SCENE.sunCorner[dim2];
                if (dim1FromSun >= 0 && dim1FromSun <= SIDE_LENGTH && dim2FromSun >= 0 && dim2FromSun <= SIDE_LENGTH) {
                    sunHit = true;
                    break;
                }
            }
            RENDER_SUN_SELECTION = sunHit;

            if (mouseDown) {
                let xMove = e.movementX * movementSpeed;
                let yMove = e.movementY * movementSpeed;
                if (sunHit) {
                    MOVE_SUN = true;
                }
                if (MOVE_SUN) {
                    let a = vec3.sub(vec3.create(), SCENE.sunCenter, CAMERA.getPosition());
                    let b = vec3.sub(vec3.create(), CAMERA.ref, CAMERA.getPosition());
                    let projection = vec3.dot(a, b) / Math.pow(vec3.length(b), 2);
                    let passThroughPoint = vec3.add(vec3.create(), CAMERA.getPosition(), vec3.scale(vec3.create(), b, projection));

                    let tNumerator = (b[0] * (start[0] - passThroughPoint[0])) +
                        (b[1] * (start[1] - passThroughPoint[1])) +
                        (b[2] * (start[2] - passThroughPoint[2]));
                    let tDenominator = (-b[0] * v[0]) - (b[1] * v[1]) - (b[2] * v[2]);
                    let tNew = tNumerator / tDenominator;
                    let sunPosition = vec3.add(vec3.create(), start, vec3.scale(vec3.create(), v, tNew));
                    SCENE.setSunCenter(sunPosition);
                } else {
                    CAMERA.rotateTheta(xMove);
                    CAMERA.rotatePhi(yMove);
                }
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
                LAYER_LABEL.innerHTML = currentLayer.toString();
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
        switch (e.button) {
            case 0:
                mouseDown = true;
                break;
        }
    }

    const mouseUpHandler = (e: MouseEvent) => {
        switch (e.button) {
            case 0:
                mouseDown = false;
                MOVE_SUN = false;
                break;
        }
    }

    const keyDownHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = true;
                break;
            case "Space":
                e.preventDefault();
        }
    }

    const keyUpHandler = (e: KeyboardEvent) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = false;
                break;
            case "Space":
                if (CAMERA.getMode() == Mode.Editor) {
                    toggleToViewer();
                } else if (CAMERA.getMode() == Mode.Viewer) {
                    RENDER_HOVER_CUBE = false;
                    TRANSITIONING = true;
                    TRANSITION_TIME = 0;
                    CAMERA.changeToEditor();
                }
        }
    }

    function toggleToViewer() {
        RENDER_HOVER_CUBE = false;
        TRANSITIONING = true;
        TRANSITION_TIME = 0;
        let yRange: vec2 = SCENE.cubeSpace.populateBuffers();
        let viewerRefY = (yRange[0] + yRange[1]) / (2 * DIVISION_FACTOR);
        CAMERA.setViewerRef(vec3.fromValues(0, viewerRefY, 0));
        CAMERA.changeToViewer();
    }

    const colorisPickHandler = (e: any) => {
        let rgbString = e.detail.color;
        let rgbArray = rgbString.slice(
            rgbString.indexOf("(") + 1,
            rgbString.indexOf(")")
        ).split(", ");
        if (colorMode == COLOR_MODE.CUBE) {
            HOVER_CUBE_COLOR[0] = rgbArray[0] / 255;
            HOVER_CUBE_COLOR[1] = rgbArray[1] / 255;
            HOVER_CUBE_COLOR[2] = rgbArray[2] / 255;
            SCENE.setHoverCubeColor(HOVER_CUBE_COLOR);
        } else if (colorMode == COLOR_MODE.BACKGROUND) {
            let newBackgroundColor = vec3.fromValues(rgbArray[0] / 255,
                rgbArray[1] / 255,
                rgbArray[2] / 255);
            SCENE.setBackgroundColor(newBackgroundColor);
        }
    }

    const downloadButtonClickHandler = (e: PointerEvent) => {
        let cubeSpaceString = JSON.stringify(SCENE.cubeSpace.cubeSpace);
        const file = new File([cubeSpaceString], 'new-note.txt', {
            type: 'text/plain',
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(file);

        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    CANVAS.addEventListener('mousemove', moveHandler, false);
    CANVAS.addEventListener('click', clickHandler, false);
    CANVAS.addEventListener('mousedown', mouseDownHandler, false);
    CANVAS.addEventListener('mouseup', mouseUpHandler, false);
    CANVAS.addEventListener('wheel', mousewheelHandler, false);
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('coloris:pick', colorisPickHandler);
    document.getElementById("downloadButton")?.addEventListener('click', downloadButtonClickHandler, false);
    document.getElementById("toggleSunButton")?.addEventListener('click', () => {
        SCENE.toggleSun();
    })
    document.getElementById("closeEditorButton")?.addEventListener('click', () => {
        let editorPaneElement = document.getElementById("editorPane");
        if (editorPaneElement != null) {
            editorPaneElement.style.display = "none";
        }
    });
    document.getElementById("openEditorButton")?.addEventListener('click', () => {
        let editorPaneElement = document.getElementById("editorPane");
        if (editorPaneElement != null) {
            editorPaneElement.style.display = "block";
        }
    });
    document.getElementById("modelLoadButton")?.addEventListener('click', () => {
        let selectElement = document.getElementById("models");
        if (selectElement != null) {
            let modelName = (selectElement as HTMLSelectElement).value;
            fetch("/models/" + modelName)
                .then((res) => {
                    return res.text();
                })
                .then((text) => {
                    let model: (vec3 | undefined)[] = JSON.parse(text);
                    SCENE.cubeSpace.cubeSpace = model;
                    toggleToViewer();
                    SCENE.setCubeLayer(Math.round(LAYER));
                })
                .catch((e) => console.error(e));
        }
    })
    document.getElementById("cubeColor")?.addEventListener('click', () => {
        colorMode = COLOR_MODE.CUBE;
    });
    document.getElementById("backgroundColor")?.addEventListener('click', () => {
        colorMode = COLOR_MODE.BACKGROUND;
    });
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
                cameraPosition: gl.getUniformLocation(flatShaderProgram, 'uCameraPosition'),
                sunPosition: gl.getUniformLocation(flatShaderProgram, 'uSunPosition'),
                sunColor: gl.getUniformLocation(flatShaderProgram, 'uSunColor')
            }
        }
    }

    registerControls();

    gl.useProgram(programInfo.flatShader.program);

    SCENE = new Scene(gl, DIVISION_FACTOR, UPPER_LEFT, HOVER_CUBE_COLOR);

    PREVIOUS_TIME = performance.now();

    function render(now: number) {
        tick(now);
        drawScene(gl);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    function drawScene(gl: WebGLRenderingContext) {

        gl.enable(gl.DEPTH_TEST);

        CLIENT_WIDTH = CANVAS.clientWidth;
        CLIENT_HEIGHT = CANVAS.clientHeight;

        CANVAS.width = CLIENT_WIDTH;
        CANVAS.height = CLIENT_HEIGHT;
        CAMERA.changeWidthHeight(CLIENT_WIDTH, CLIENT_HEIGHT);
        gl.viewport(0, 0, CLIENT_WIDTH, CLIENT_HEIGHT);

        gl.clearColor(SCENE.backgroundColor[0],
            SCENE.backgroundColor[1],
            SCENE.backgroundColor[2], 1.0);
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
            // Draw tiles
            for (let tile of SCENE.editorTiles) {
                gl.bindBuffer(gl.ARRAY_BUFFER, tile.mesh.positionBuffer);
                gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
                gl.uniform3fv(programInfo.flatShader.uniformLocations.color, tile.color);
                gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, tile.modelMatrix);
                gl.drawArrays(tile.mesh.drawingMode, 0, tile.mesh.vertices.length / 3);
            }
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
            gl.uniform3fv(programInfo.flatShader.uniformLocations.sunColor, SCENE.sun.color);
            gl.uniform3fv(programInfo.flatShader.uniformLocations.sunPosition, SCENE.sunCenter);
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

            // Draw sun
            gl.uniform1i(programInfo.flatShader.uniformLocations.useUniformColor, 1);
            gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.sun.mesh.positionBuffer);
            gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
            gl.uniform3fv(programInfo.flatShader.uniformLocations.color, SCENE.sun.color);
            gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, SCENE.sun.modelMatrix);
            gl.drawArrays(SCENE.sun.mesh.drawingMode, 0, SCENE.sun.mesh.vertices.length / 3);

            // Draw sun selection
            if (RENDER_SUN_SELECTION) {
                gl.disable(gl.DEPTH_TEST);
                gl.bindBuffer(gl.ARRAY_BUFFER, SCENE.sunSelection.mesh.positionBuffer);
                gl.vertexAttribPointer(programInfo.flatShader.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(programInfo.flatShader.attribLocations.vertexPosition);
                gl.uniform3fv(programInfo.flatShader.uniformLocations.color, SCENE.sunSelection.color);
                gl.uniformMatrix4fv(programInfo.flatShader.uniformLocations.modelMatrix, false, SCENE.sunSelection.modelMatrix);
                gl.drawArrays(SCENE.sunSelection.mesh.drawingMode, 0, SCENE.sunSelection.mesh.vertices.length / 3);
            }
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