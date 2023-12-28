import { vec4 } from "../gl-matrix/index.js";
export default class TracerRenderer {
    constructor(gl, tracerShaderProgram) {
        this.screen00 = vec4.fromValues(-1, -1, 0, 1);
        this.screen01 = vec4.fromValues(-1, +1, 0, 1);
        this.screen10 = vec4.fromValues(+1, -1, 0, 1);
        this.screen11 = vec4.fromValues(+1, +1, 0, 1);
        this.gl = gl;
        this.tracerShaderProgram = tracerShaderProgram;
        this.programInfo = {
            attribLocations: {
                vertexPosition: gl.getAttribLocation(tracerShaderProgram, "aVertexPosition")
            },
            uniformLocations: {
                ray00: gl.getUniformLocation(tracerShaderProgram, "uRay00"),
                ray01: gl.getUniformLocation(tracerShaderProgram, "uRay01"),
                ray10: gl.getUniformLocation(tracerShaderProgram, "uRay10"),
                ray11: gl.getUniformLocation(tracerShaderProgram, "uRay11"),
                eye: gl.getUniformLocation(tracerShaderProgram, "uEye"),
                cubeSpaceTexture: gl.getUniformLocation(tracerShaderProgram, "uCubeSpaceTexture")
            }
        };
    }
    render() {
    }
}
