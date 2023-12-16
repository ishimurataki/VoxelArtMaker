import initShaderProgram from "./utils/shader_helper.js";
import { flatVertexShaderSource, flatFragmentShaderSource } from "./shaders/flat_shader.js";
import { Mode, PolarCamera } from "./polar_camera.js";
import { vec2, vec3, mat4 } from "./gl-matrix/index.js";
import Scene from "./renderables/scene.js";
// GLOBAL VARIABLES DECLARATIONS
let CLIENT_WIDTH = 0;
let CLIENT_HEIGHT = 0;
let CANVAS;
let LAYER_LABEL;
let CAMERA = new PolarCamera(0, 0);
let VIEW_PROJECTION_INVERSE = mat4.create();
let DIVISION_FACTOR = 32;
let SIDE_LENGTH = 1 / DIVISION_FACTOR;
let UPPER_LEFT = vec2.fromValues(-0.5, -0.5);
let SCENE;
let RENDER_HOVER_CUBE = false;
let HOVER_CUBE_COLOR = vec3.fromValues(0.31372, 0.7843, 0.47059);
let LAYER = 0;
let TRANSITIONING = false;
let TRANSITION_TIME = 0;
let PREVIOUS_TIME = 0;
const registerControls = () => {
    var _a, _b, _c, _d, _e, _f;
    let mouseDown = false;
    let shiftDown = false;
    let cubePlacedInCurrentPos = false;
    let xIndex = -1;
    let zIndex = -1;
    let movementSpeed = 0.01;
    let zoomSpeed = -0.008;
    let layerScrollSpeed = 0.005;
    let COLOR_MODE;
    (function (COLOR_MODE) {
        COLOR_MODE[COLOR_MODE["CUBE"] = 0] = "CUBE";
        COLOR_MODE[COLOR_MODE["BACKGROUND"] = 1] = "BACKGROUND";
    })(COLOR_MODE || (COLOR_MODE = {}));
    ;
    let colorMode = COLOR_MODE.CUBE;
    const moveHandler = (e) => {
        if (CAMERA.getMode() == Mode.Editor) {
            const rect = CANVAS.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const clipX = x / rect.width * 2 - 1;
            const clipY = y / rect.height * -2 + 1;
            const start = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, -1), VIEW_PROJECTION_INVERSE);
            const end = vec3.transformMat4(vec3.create(), vec3.fromValues(clipX, clipY, 1), VIEW_PROJECTION_INVERSE);
            const v = vec3.sub(vec3.create(), end, start);
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
                }
                else {
                    SCENE.addCube(xIndex, zIndex);
                }
                cubePlacedInCurrentPos = true;
            }
        }
        else if (CAMERA.getMode() == Mode.Viewer) {
            if (mouseDown) {
                let xMove = e.movementX * movementSpeed;
                let yMove = e.movementY * movementSpeed;
                CAMERA.rotateTheta(xMove);
                CAMERA.rotatePhi(yMove);
            }
        }
    };
    const mousewheelHandler = (e) => {
        e.preventDefault();
        if (CAMERA.getMode() == Mode.Viewer) {
            let zoom = zoomSpeed * e.deltaY;
            CAMERA.zoom(zoom);
        }
        else if (CAMERA.getMode() == Mode.Editor) {
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
    };
    const clickHandler = (e) => {
        if (CAMERA.getMode() == Mode.Editor) {
            if (shiftDown) {
                RENDER_HOVER_CUBE = false;
                SCENE.deleteCube(xIndex, zIndex);
            }
            else {
                SCENE.addCube(xIndex, zIndex);
            }
        }
    };
    const mouseDownHandler = (e) => {
        switch (e.button) {
            case 0:
                mouseDown = true;
                break;
        }
    };
    const mouseUpHandler = (e) => {
        switch (e.button) {
            case 0:
                mouseDown = false;
                break;
        }
    };
    const keyDownHandler = (e) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = true;
                break;
            case "Space":
                e.preventDefault();
        }
    };
    const keyUpHandler = (e) => {
        switch (e.code) {
            case "ShiftLeft":
                shiftDown = false;
                break;
            case "Space":
                if (CAMERA.getMode() == Mode.Editor) {
                    toggleToViewer();
                }
                else if (CAMERA.getMode() == Mode.Viewer) {
                    RENDER_HOVER_CUBE = false;
                    TRANSITIONING = true;
                    TRANSITION_TIME = 0;
                    CAMERA.changeToEditor();
                }
        }
    };
    function toggleToViewer() {
        RENDER_HOVER_CUBE = false;
        TRANSITIONING = true;
        TRANSITION_TIME = 0;
        let yRange = SCENE.cubeSpace.populateBuffers();
        let viewerRefY = (yRange[0] + yRange[1]) / (2 * DIVISION_FACTOR);
        CAMERA.setViewerRef(vec3.fromValues(0, viewerRefY, 0));
        CAMERA.changeToViewer();
    }
    const colorisPickHandler = (e) => {
        let rgbString = e.detail.color;
        let rgbArray = rgbString.slice(rgbString.indexOf("(") + 1, rgbString.indexOf(")")).split(", ");
        if (colorMode == COLOR_MODE.CUBE) {
            HOVER_CUBE_COLOR[0] = rgbArray[0] / 255;
            HOVER_CUBE_COLOR[1] = rgbArray[1] / 255;
            HOVER_CUBE_COLOR[2] = rgbArray[2] / 255;
            SCENE.setHoverCubeColor(HOVER_CUBE_COLOR);
        }
        else if (colorMode == COLOR_MODE.BACKGROUND) {
            let newBackgroundColor = vec3.fromValues(rgbArray[0] / 255, rgbArray[1] / 255, rgbArray[2] / 255);
            SCENE.setBackgroundColor(newBackgroundColor);
        }
    };
    const downloadButtonClickHandler = (e) => {
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
    };
    CANVAS.addEventListener('mousemove', moveHandler, false);
    CANVAS.addEventListener('click', clickHandler, false);
    CANVAS.addEventListener('mousedown', mouseDownHandler, false);
    CANVAS.addEventListener('mouseup', mouseUpHandler, false);
    CANVAS.addEventListener('wheel', mousewheelHandler, false);
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);
    document.addEventListener('coloris:pick', colorisPickHandler);
    (_a = document.getElementById("downloadButton")) === null || _a === void 0 ? void 0 : _a.addEventListener('click', downloadButtonClickHandler, false);
    (_b = document.getElementById("closeEditorButton")) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        let editorPaneElement = document.getElementById("editorPane");
        if (editorPaneElement != null) {
            editorPaneElement.style.display = "none";
        }
    });
    (_c = document.getElementById("openEditorButton")) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        let editorPaneElement = document.getElementById("editorPane");
        if (editorPaneElement != null) {
            editorPaneElement.style.display = "block";
        }
    });
    (_d = document.getElementById("modelLoadButton")) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => {
        let selectElement = document.getElementById("models");
        if (selectElement != null) {
            let modelName = selectElement.value;
            fetch("/models/" + modelName)
                .then((res) => {
                return res.text();
            })
                .then((text) => {
                let model = JSON.parse(text);
                SCENE.cubeSpace.cubeSpace = model;
                toggleToViewer();
                SCENE.setCubeLayer(Math.round(LAYER));
            })
                .catch((e) => console.error(e));
        }
    });
    (_e = document.getElementById("cubeColor")) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => {
        colorMode = COLOR_MODE.CUBE;
    });
    (_f = document.getElementById("backgroundColor")) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => {
        colorMode = COLOR_MODE.BACKGROUND;
    });
};
function main() {
    console.log("Starting main function.");
    const layerLabelMaybeNull = document.getElementById("layerLabel");
    if (layerLabelMaybeNull == null) {
        alert("Couldn't find layer label element.");
        return;
    }
    LAYER_LABEL = layerLabelMaybeNull;
    const canvasMaybeNull = document.querySelector("#glCanvas");
    if (canvasMaybeNull == null) {
        alert("Couldn't find canvas element.");
        return;
    }
    CANVAS = canvasMaybeNull;
    CLIENT_WIDTH = CANVAS.clientWidth;
    CLIENT_HEIGHT = CANVAS.clientHeight;
    CANVAS.width = CLIENT_WIDTH;
    CANVAS.height = CLIENT_HEIGHT;
    const glMaybeNull = CANVAS.getContext("webgl");
    if (glMaybeNull == null) {
        alert("Unable to initialize WebGL context. Your browser or machine may not support it.");
        return;
    }
    const gl = glMaybeNull;
    const flatShaderProgram = initShaderProgram(gl, flatVertexShaderSource, flatFragmentShaderSource);
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
    };
    registerControls();
    gl.useProgram(programInfo.flatShader.program);
    SCENE = new Scene(gl, DIVISION_FACTOR, UPPER_LEFT, HOVER_CUBE_COLOR);
    PREVIOUS_TIME = performance.now();
    function render(now) {
        tick(now);
        drawScene(gl);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
    gl.enable(gl.DEPTH_TEST);
    function drawScene(gl) {
        CLIENT_WIDTH = CANVAS.clientWidth;
        CLIENT_HEIGHT = CANVAS.clientHeight;
        CANVAS.width = CLIENT_WIDTH;
        CANVAS.height = CLIENT_HEIGHT;
        CAMERA.changeWidthHeight(CLIENT_WIDTH, CLIENT_HEIGHT);
        gl.viewport(0, 0, CLIENT_WIDTH, CLIENT_HEIGHT);
        gl.clearColor(SCENE.backgroundColor[0], SCENE.backgroundColor[1], SCENE.backgroundColor[2], 1.0);
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
            let firstCube = true;
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
function tick(currentTime) {
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
