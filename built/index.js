import initShaderProgram from "./utils/shader_helper.js";
import { plainVertexShaderSource, plainFragmentShaderSource } from "./shaders/plain_shader.js";
import { tracerVertexSource, tracerFragmentSource } from "./shaders/tracer_shader.js";
import { vec2 } from "./gl-matrix/index.js";
import { PolarCamera } from "./polar_camera.js";
import Scene from "./renderables/scene.js";
import Controls from "./controls.js";
import GlobalState from "./global_state.js";
import Renderer from "./renderer.js";
function main() {
    console.log("Starting main function.");
    const canvasMaybeNull = document.querySelector("#glCanvas");
    if (canvasMaybeNull == null) {
        alert("Couldn't find canvas element.");
        return;
    }
    let canvas = canvasMaybeNull;
    let divisionFactor = 32;
    let upperLeft = vec2.fromValues(-0.5, -0.5);
    const globalState = new GlobalState(canvas, divisionFactor, upperLeft);
    const glMaybeNull = canvas.getContext("webgl");
    if (glMaybeNull == null) {
        alert("Unable to initialize WebGL context. Your browser or machine may not support it.");
        return;
    }
    const gl = glMaybeNull;
    const camera = new PolarCamera(0, 0);
    const scene = new Scene(gl, globalState);
    const controls = new Controls(globalState, camera, scene);
    controls.registerControls();
    const plainShaderProgram = initShaderProgram(gl, plainVertexShaderSource, plainFragmentShaderSource);
    if (plainShaderProgram == null) {
        alert("Could not compile flat shader program");
        return;
    }
    const tracerShaderProgram = initShaderProgram(gl, tracerVertexSource, tracerFragmentSource(divisionFactor));
    if (tracerShaderProgram == null) {
        alert("Could not compile tracer shader program");
        return;
    }
    const renderer = new Renderer(gl, globalState, tracerShaderProgram, plainShaderProgram, camera, scene);
    gl.useProgram(plainShaderProgram);
    function render(now) {
        renderer.tick(now);
        renderer.render();
        globalState.previousTime = now;
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
window.onload = main;
