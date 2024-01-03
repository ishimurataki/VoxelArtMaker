import { vec3, vec4, mat4 } from "./gl-matrix/index.js";
import { Mode } from "./polar_camera.js";
var ShaderMode;
(function (ShaderMode) {
    ShaderMode[ShaderMode["Plain"] = 0] = "Plain";
    ShaderMode[ShaderMode["Tracer"] = 1] = "Tracer";
})(ShaderMode || (ShaderMode = {}));
export default class Renderer {
    constructor(gl, globalState, tracerShaderProgram, renderShaderProgram, plainShaderProgram, camera, scene) {
        this.activeShader = ShaderMode.Plain;
        this.screen00 = vec4.fromValues(-1, -1, 0, 1);
        this.screen01 = vec4.fromValues(-1, +1, 0, 1);
        this.screen10 = vec4.fromValues(+1, -1, 0, 1);
        this.screen11 = vec4.fromValues(+1, +1, 0, 1);
        this.gl = gl;
        this.globalState = globalState;
        this.tracerShaderProgram = tracerShaderProgram;
        this.renderShaderProgram = renderShaderProgram;
        this.plainShaderProgram = plainShaderProgram;
        this.camera = camera;
        this.scene = scene;
        this.plainProgramInfo = {
            attribLocations: {
                vertexPosition: gl.getAttribLocation(plainShaderProgram, 'aVertexPosition'),
                vertexColor: gl.getAttribLocation(plainShaderProgram, 'aVertexColor'),
                vertexNormal: gl.getAttribLocation(plainShaderProgram, 'aVertexNormal')
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(plainShaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(plainShaderProgram, 'uModelViewMatrix'),
                modelMatrix: gl.getUniformLocation(plainShaderProgram, 'uModelMatrix'),
                color: gl.getUniformLocation(plainShaderProgram, 'uColor'),
                useUniformColor: gl.getUniformLocation(plainShaderProgram, 'uUseUniformColor'),
                cameraPosition: gl.getUniformLocation(plainShaderProgram, 'uCameraPosition'),
                sunPosition: gl.getUniformLocation(plainShaderProgram, 'uSunPosition'),
                sunColor: gl.getUniformLocation(plainShaderProgram, 'uSunColor'),
                sunStrength: gl.getUniformLocation(plainShaderProgram, "uSunStrength"),
                ambienceStrength: gl.getUniformLocation(plainShaderProgram, "uAmbienceStrength")
            }
        };
        this.tracerProgramInfo = {
            attribLocations: {
                vertexPosition: gl.getAttribLocation(tracerShaderProgram, "aVertexPosition")
            },
            uniformLocations: {
                ray00: gl.getUniformLocation(tracerShaderProgram, "uRay00"),
                ray01: gl.getUniformLocation(tracerShaderProgram, "uRay01"),
                ray10: gl.getUniformLocation(tracerShaderProgram, "uRay10"),
                ray11: gl.getUniformLocation(tracerShaderProgram, "uRay11"),
                eye: gl.getUniformLocation(tracerShaderProgram, "uEye"),
                renderTexture: gl.getUniformLocation(tracerShaderProgram, "uRenderTexture"),
                cubeSpaceTexture: gl.getUniformLocation(tracerShaderProgram, "uCubeSpaceTexture"),
                timeSinceStart: gl.getUniformLocation(tracerShaderProgram, "uTimeSinceStart"),
                textureWeight: gl.getUniformLocation(tracerShaderProgram, "uTextureWeight"),
                sunPosition: gl.getUniformLocation(tracerShaderProgram, "uLightPos"),
                width: gl.getUniformLocation(tracerShaderProgram, "uWidth"),
                height: gl.getUniformLocation(tracerShaderProgram, "uHeight"),
                backgroundColor: gl.getUniformLocation(tracerShaderProgram, "uBackgroundColor"),
                tracerMaterial: gl.getUniformLocation(tracerShaderProgram, "uTracerMaterial"),
                diffuseStrength: gl.getUniformLocation(tracerShaderProgram, "uDiffuseStrength"),
                ambienceStrength: gl.getUniformLocation(tracerShaderProgram, "uAmbienceStrength")
            }
        };
        this.renderProgramInfo = {
            attribLocations: {
                vertexPosition: gl.getAttribLocation(renderShaderProgram, "aVertexPosition")
            },
            uniformLocations: {
                renderTexture: gl.getUniformLocation(renderShaderProgram, "uRenderTexture")
            }
        };
        let vertices = [
            -1, -1,
            -1, +1,
            +1, -1,
            +1, +1
        ];
        this.tracerVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tracerVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.tracerFrameBuffer = gl.createFramebuffer();
        this.tracerTextures = [];
        for (let i = 0; i < 2; i++) {
            this.tracerTextures.push(gl.createTexture());
            gl.bindTexture(gl.TEXTURE_2D, this.tracerTextures[i]);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.globalState.canvas.clientWidth, this.globalState.canvas.clientHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        this.previousCanvasWidth = this.globalState.canvas.clientWidth;
        this.previousCanvasHeight = this.globalState.canvas.clientHeight;
        this.gl.viewport(0, 0, this.globalState.canvas.clientWidth, this.globalState.canvas.clientHeight);
    }
    resizeTracerTextures() {
        this.tracerFrameBuffer = this.gl.createFramebuffer();
        this.tracerTextures = [];
        for (let i = 0; i < 2; i++) {
            this.tracerTextures.push(this.gl.createTexture());
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tracerTextures[i]);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.globalState.canvas.clientWidth, this.globalState.canvas.clientHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        this.globalState.sampleCount = 0;
    }
    tick(currentTime) {
        let deltaTime = currentTime - this.globalState.previousTime;
        if (this.globalState.transitioning) {
            let a = this.globalState.transitionTime / 1000;
            if (a > 1) {
                this.globalState.transitioning = false;
                this.globalState.transitionTime = 0;
            }
            this.camera.transition(a);
            this.globalState.transitionTime += deltaTime;
            this.globalState.sampleCount = 0;
        }
    }
    render(currentTime) {
        this.gl.enable(this.gl.DEPTH_TEST);
        this.globalState.canvas.width = this.globalState.canvas.clientWidth;
        this.globalState.canvas.height = this.globalState.canvas.clientHeight;
        if (this.globalState.canvas.clientWidth != this.previousCanvasWidth ||
            this.globalState.canvas.clientHeight != this.previousCanvasHeight) {
            this.camera.changeWidthHeight(this.globalState.canvas.clientWidth, this.globalState.canvas.clientHeight);
            this.gl.viewport(0, 0, this.globalState.canvas.clientWidth, this.globalState.canvas.clientHeight);
            this.previousCanvasWidth = this.globalState.canvas.clientWidth;
            this.previousCanvasHeight = this.globalState.canvas.clientHeight;
            this.resizeTracerTextures();
        }
        this.gl.clearColor(this.scene.backgroundColor[0], this.scene.backgroundColor[1], this.scene.backgroundColor[2], 1.0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        let projectionMatrix = this.camera.getProjMatrix();
        let modelViewMatrix = this.camera.getViewMatrix();
        let viewProjectionMatrix = mat4.multiply(mat4.create(), projectionMatrix, modelViewMatrix);
        mat4.invert(this.globalState.viewProjectionInverse, viewProjectionMatrix);
        if (this.camera.getMode() == Mode.Editor) {
            if (this.activeShader != ShaderMode.Plain) {
                this.gl.useProgram(this.plainShaderProgram);
                this.activeShader = ShaderMode.Plain;
            }
            this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.cameraPosition, this.camera.getPosition());
            this.gl.uniform1i(this.plainProgramInfo.uniformLocations.useUniformColor, 1);
            // Draw tiles
            for (let tile of this.scene.editorTiles) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, tile.mesh.positionBuffer);
                this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
                this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.color, tile.color);
                this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, tile.modelMatrix);
                this.gl.drawArrays(tile.mesh.drawingMode, 0, tile.mesh.vertices.length / 3);
            }
            // Draw cubes
            let firstCube = true;
            for (let cube of this.scene.cubeLayer.values()) {
                if (firstCube) {
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, cube.mesh.positionBuffer);
                    this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
                    this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
                    firstCube = false;
                }
                this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.color, cube.color);
                this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, cube.modelMatrix);
                this.gl.drawArrays(cube.mesh.drawingMode, 0, cube.mesh.vertices.length / 3);
            }
            // Draw hover cube
            if (this.globalState.renderHoverCube) {
                if (firstCube) {
                    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.hoverCube.mesh.positionBuffer);
                    this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
                    this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
                }
                this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.color, this.scene.hoverCubeColor);
                this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, this.scene.hoverCube.modelMatrix);
                this.gl.drawArrays(this.scene.hoverCube.mesh.drawingMode, 0, this.scene.hoverCube.mesh.vertices.length / 3);
            }
            // Draw grid
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.grid.mesh.positionBuffer);
            this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
            this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.color, this.scene.grid.color);
            this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, this.scene.grid.modelMatrix);
            this.gl.drawArrays(this.scene.grid.mesh.drawingMode, 0, this.scene.grid.mesh.vertices.length / 3);
        }
        else if (this.camera.getMode() == Mode.Viewer) {
            if (this.globalState.rayTrace) {
                if (this.activeShader != ShaderMode.Tracer) {
                    this.gl.useProgram(this.tracerShaderProgram);
                    this.activeShader = ShaderMode.Tracer;
                }
                this.renderViewerRayTraced(viewProjectionMatrix, currentTime);
            }
            else {
                if (this.activeShader != ShaderMode.Plain) {
                    this.gl.useProgram(this.plainShaderProgram);
                    this.activeShader = ShaderMode.Plain;
                }
                this.renderViewerPlain(projectionMatrix, modelViewMatrix);
            }
        }
    }
    renderViewerPlain(projectionMatrix, modelViewMatrix) {
        this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.cameraPosition, this.camera.getPosition());
        this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.sunColor, this.scene.sun.color);
        this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.sunPosition, this.scene.sunCenter);
        this.gl.uniform1f(this.plainProgramInfo.uniformLocations.sunStrength, this.globalState.sunStrength);
        this.gl.uniform1f(this.plainProgramInfo.uniformLocations.ambienceStrength, this.globalState.ambienceStrength);
        this.gl.uniform1i(this.plainProgramInfo.uniformLocations.useUniformColor, 0);
        // Draw cube space
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.cubeSpace.cubeSpacePositionBuffer);
        this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.cubeSpace.cubeSpaceNormalBuffer);
        this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexNormal);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.cubeSpace.cubeSpaceColorBuffer);
        this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexColor, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexColor);
        this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, mat4.create());
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.scene.cubeSpace.cubeSpaceNumberOfVertices);
        this.gl.disableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexNormal);
        this.gl.disableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexColor);
        // Draw sun
        this.gl.uniform1i(this.plainProgramInfo.uniformLocations.useUniformColor, 1);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.sun.mesh.positionBuffer);
        this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
        this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.color, this.scene.sun.color);
        this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, this.scene.sun.modelMatrix);
        this.gl.drawArrays(this.scene.sun.mesh.drawingMode, 0, this.scene.sun.mesh.vertices.length / 3);
        // Draw sun selection
        if (this.globalState.renderSunSelection) {
            this.gl.disable(this.gl.DEPTH_TEST);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.scene.sunSelection.mesh.positionBuffer);
            this.gl.vertexAttribPointer(this.plainProgramInfo.attribLocations.vertexPosition, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(this.plainProgramInfo.attribLocations.vertexPosition);
            this.gl.uniform3fv(this.plainProgramInfo.uniformLocations.color, this.scene.sunSelection.color);
            this.gl.uniformMatrix4fv(this.plainProgramInfo.uniformLocations.modelMatrix, false, this.scene.sunSelection.modelMatrix);
            this.gl.drawArrays(this.scene.sunSelection.mesh.drawingMode, 0, this.scene.sunSelection.mesh.vertices.length / 3);
        }
    }
    renderViewerRayTraced(viewProjectionMatrix, currentTime) {
        this.gl.useProgram(this.tracerShaderProgram);
        this.gl.uniform1f(this.tracerProgramInfo.uniformLocations.width, this.globalState.canvas.clientWidth);
        this.gl.uniform1f(this.tracerProgramInfo.uniformLocations.height, this.globalState.canvas.clientHeight);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.backgroundColor, this.scene.backgroundColor);
        this.gl.uniform1i(this.tracerProgramInfo.uniformLocations.tracerMaterial, this.globalState.tracerMaterial);
        this.gl.uniform1f(this.tracerProgramInfo.uniformLocations.diffuseStrength, this.globalState.sunStrength);
        this.gl.uniform1f(this.tracerProgramInfo.uniformLocations.ambienceStrength, this.globalState.ambienceStrength);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.eye, this.camera.eye);
        let jitter = vec3.scale(vec3.create(), vec3.fromValues(Math.random() * 2 - 1, Math.random() * 2 - 1, 0), 1 / 5000);
        let inverse = mat4.invert(mat4.create(), mat4.translate(mat4.create(), viewProjectionMatrix, jitter));
        let ray00_i1 = vec4.transformMat4(vec4.create(), this.screen00, inverse);
        let ray01_i1 = vec4.transformMat4(vec4.create(), this.screen01, inverse);
        let ray10_i1 = vec4.transformMat4(vec4.create(), this.screen10, inverse);
        let ray11_i1 = vec4.transformMat4(vec4.create(), this.screen11, inverse);
        let ray00_i2 = vec4.scale(vec4.create(), ray00_i1, 1 / ray00_i1[3]);
        let ray01_i2 = vec4.scale(vec4.create(), ray01_i1, 1 / ray01_i1[3]);
        let ray10_i2 = vec4.scale(vec4.create(), ray10_i1, 1 / ray10_i1[3]);
        let ray11_i2 = vec4.scale(vec4.create(), ray11_i1, 1 / ray11_i1[3]);
        let ray00 = vec3.subtract(vec3.create(), vec3.fromValues(ray00_i2[0], ray00_i2[1], ray00_i2[2]), this.camera.eye);
        let ray01 = vec3.subtract(vec3.create(), vec3.fromValues(ray01_i2[0], ray01_i2[1], ray01_i2[2]), this.camera.eye);
        let ray10 = vec3.subtract(vec3.create(), vec3.fromValues(ray10_i2[0], ray10_i2[1], ray10_i2[2]), this.camera.eye);
        let ray11 = vec3.subtract(vec3.create(), vec3.fromValues(ray11_i2[0], ray11_i2[1], ray11_i2[2]), this.camera.eye);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.ray00, ray00);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.ray01, ray01);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.ray10, ray10);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.ray11, ray11);
        this.gl.uniform3fv(this.tracerProgramInfo.uniformLocations.sunPosition, this.scene.sunCenter);
        this.gl.uniform1f(this.tracerProgramInfo.uniformLocations.timeSinceStart, currentTime);
        let textureWeight = this.globalState.sampleCount / (this.globalState.sampleCount + 1);
        this.gl.uniform1f(this.tracerProgramInfo.uniformLocations.textureWeight, textureWeight);
        this.gl.uniform1i(this.tracerProgramInfo.uniformLocations.cubeSpaceTexture, 1);
        this.gl.uniform1i(this.tracerProgramInfo.uniformLocations.renderTexture, 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.scene.cubeSpace.cubeSpaceTexture);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tracerTextures[0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tracerVertexBuffer);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.tracerFrameBuffer);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.tracerTextures[1], 0);
        this.gl.vertexAttribPointer(this.tracerProgramInfo.attribLocations.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.tracerProgramInfo.attribLocations.vertexPosition);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.tracerTextures.reverse();
        this.gl.useProgram(this.renderShaderProgram);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tracerTextures[0]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tracerVertexBuffer);
        this.gl.vertexAttribPointer(this.renderProgramInfo.attribLocations.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.renderProgramInfo.attribLocations.vertexPosition);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.globalState.sampleCount++;
    }
}
