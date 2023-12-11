import { vec2 } from "../gl-matrix/index.js";

export default class CubeSpace {
    cubeSpace: (vec3 | undefined)[];
    cubeSpacePositionBuffer: WebGLBuffer | null;
    cubeSpaceNormalBuffer: WebGLBuffer | null;
    cubeSpaceColorBuffer: WebGLBuffer | null;
    cubeSpaceNumberOfVertices: number = 0;
    divisionFactor: number;
    cubeSideLength: number;
    upperLeft: vec2;
    gl: WebGLRenderingContext

    constructor(gl: WebGLRenderingContext, divisionFactor: number, upperLeft: vec2) {
        this.cubeSpace = new Array<vec3>(Math.pow(divisionFactor, 3));
        this.cubeSpace.fill(undefined);
        this.divisionFactor = divisionFactor;
        this.cubeSideLength = 1 / this.divisionFactor;
        this.upperLeft = upperLeft;
        this.gl = gl;
    }

    private getCubeIndex(x: number, y: number, z: number): number {
        return (y * Math.pow(this.divisionFactor, 2)) + (x * this.divisionFactor) + z;
    }

    setCube(x: number, y: number, z: number, color: vec3): void {
        this.cubeSpace[this.getCubeIndex(x, y, z)] = color;
    }

    deleteCube(x: number, y: number, z: number): void {
        this.cubeSpace[this.getCubeIndex(x, y, z)] = undefined;
    }

    populateBuffers(): vec2 {
        let vertices = [];
        let normals = [];
        let colors = [];
        let xStart = this.upperLeft[0];
        let zStart = this.upperLeft[1];
        let yMin = Number.MAX_SAFE_INTEGER;
        let yMax = -1;
        for (let y = 0; y < this.divisionFactor; y++) {
            let yPad = this.divisionFactor * this.divisionFactor * y;
            let yPadBelow = this.divisionFactor * this.divisionFactor * (y - 1);
            let yWorldSpace = y * this.cubeSideLength;
            let yNextWorldSpace = (y + 1) * this.cubeSideLength;
            for (let x = 0; x < this.divisionFactor; x++) {
                let xPad = this.divisionFactor * x;
                let xPadLeft = this.divisionFactor * (x - 1);
                let xWorldSpace = xStart + x * this.cubeSideLength;
                let xNextWorldSpace = xStart + (x + 1) * this.cubeSideLength;
                for (let z = 0; z < this.divisionFactor; z++) {
                    let zWorldSpace = zStart + z * this.cubeSideLength;
                    let zNextWorldSpace = zStart + (z + 1) * this.cubeSideLength;
                    let cubeColor = this.cubeSpace[yPad + xPad + z];

                    // Bottom faces
                    let renderBottomFace = false;
                    let renderBottomColor = cubeColor;
                    if (y == 0) {
                        renderBottomFace = cubeColor != undefined;
                    } else {
                        let cubeBelowColor = this.cubeSpace[yPadBelow + xPad + z];
                        if (cubeColor != undefined && cubeBelowColor == undefined) {
                            renderBottomFace = true;
                            renderBottomColor = cubeColor;
                        } else if (cubeColor == undefined && cubeBelowColor != undefined) {
                            renderBottomFace = true;
                            renderBottomColor = cubeBelowColor;
                        }
                    }
                    if (renderBottomFace && renderBottomColor != undefined) {
                        vertices.push(
                            xWorldSpace, yWorldSpace, zWorldSpace,
                            xWorldSpace, yWorldSpace, zNextWorldSpace,
                            xNextWorldSpace, yWorldSpace, zNextWorldSpace,
                            xNextWorldSpace, yWorldSpace, zNextWorldSpace,
                            xNextWorldSpace, yWorldSpace, zWorldSpace,
                            xWorldSpace, yWorldSpace, zWorldSpace
                        );
                        let normal = (cubeColor != undefined) ? -1.0 : 1.0;
                        for (let i = 0; i < 6; i++) {
                            colors.push(renderBottomColor[0], renderBottomColor[1], renderBottomColor[2]);
                            normals.push(0.0, normal, 0.0);
                        }
                    }

                    // Left faces
                    let renderLeftFace = false;
                    let renderLeftColor = cubeColor;
                    if (x == 0) {
                        renderLeftFace = cubeColor != undefined;
                    } else {
                        let cubeLeftColor = this.cubeSpace[yPad + xPadLeft + z];
                        if (cubeColor != undefined && cubeLeftColor == undefined) {
                            renderLeftFace = true;
                            renderLeftColor = cubeColor;
                        } else if (cubeColor == undefined && cubeLeftColor != undefined) {
                            renderLeftFace = true;
                            renderLeftColor = cubeLeftColor;
                        }
                    }
                    if (renderLeftFace && renderLeftColor != undefined) {
                        vertices.push(
                            xWorldSpace, yWorldSpace, zWorldSpace,
                            xWorldSpace, yWorldSpace, zNextWorldSpace,
                            xWorldSpace, yNextWorldSpace, zNextWorldSpace,
                            xWorldSpace, yNextWorldSpace, zNextWorldSpace,
                            xWorldSpace, yNextWorldSpace, zWorldSpace,
                            xWorldSpace, yWorldSpace, zWorldSpace
                        );
                        let normal = (cubeColor != undefined) ? -1.0 : 1.0;
                        for (let i = 0; i < 6; i++) {
                            colors.push(renderLeftColor[0], renderLeftColor[1], renderLeftColor[2]);
                            normals.push(normal, 0.0, 0.0);
                        }
                    }

                    // Front faces
                    let renderFrontFace = false;
                    let renderFrontColor = cubeColor;
                    if (z == 0) {
                        renderFrontFace = cubeColor != undefined;
                    } else {
                        let cubeFrontColor = this.cubeSpace[yPad + xPad + z - 1];
                        if (cubeColor != undefined && cubeFrontColor == undefined) {
                            renderFrontFace = true;
                            renderFrontColor = cubeColor;
                        } else if (cubeColor == undefined && cubeFrontColor != undefined) {
                            renderFrontFace = true;
                            renderFrontColor = cubeFrontColor;
                        }
                    }
                    if (renderFrontFace && renderFrontColor != undefined) {
                        vertices.push(
                            xWorldSpace, yWorldSpace, zWorldSpace,
                            xNextWorldSpace, yWorldSpace, zWorldSpace,
                            xNextWorldSpace, yNextWorldSpace, zWorldSpace,
                            xNextWorldSpace, yNextWorldSpace, zWorldSpace,
                            xWorldSpace, yNextWorldSpace, zWorldSpace,
                            xWorldSpace, yWorldSpace, zWorldSpace
                        );
                        let normal = (cubeColor != undefined) ? -1.0 : 1.0;
                        for (let i = 0; i < 6; i++) {
                            colors.push(renderFrontColor[0], renderFrontColor[1], renderFrontColor[2]);
                            normals.push(0.0, 0.0, normal)
                        }
                    }

                    // Top, right, and back faces 
                    if (cubeColor != undefined) {
                        if (y == this.divisionFactor - 1) {
                            vertices.push(
                                xWorldSpace, 1.0, zWorldSpace,
                                xWorldSpace, 1.0, zNextWorldSpace,
                                xNextWorldSpace, 1.0, zNextWorldSpace,
                                xNextWorldSpace, 1.0, zNextWorldSpace,
                                xNextWorldSpace, 1.0, zWorldSpace,
                                xWorldSpace, 1.0, zWorldSpace
                            );
                            for (let i = 0; i < 6; i++) {
                                colors.push(cubeColor[0], cubeColor[1], cubeColor[2]);
                                normals.push(0.0, 1.0, 0.0);
                            }
                        }
                        if (x == this.divisionFactor - 1) {
                            vertices.push(
                                xStart + 1.0, yWorldSpace, zWorldSpace,
                                xStart + 1.0, yWorldSpace, zNextWorldSpace,
                                xStart + 1.0, yNextWorldSpace, zNextWorldSpace,
                                xStart + 1.0, yNextWorldSpace, zNextWorldSpace,
                                xStart + 1.0, yNextWorldSpace, zWorldSpace,
                                xStart + 1.0, yWorldSpace, zWorldSpace
                            );
                            for (let i = 0; i < 6; i++) {
                                colors.push(cubeColor[0], cubeColor[1], cubeColor[2]);
                                normals.push(1.0, 0.0, 0.0);
                            }
                        }
                        if (z == this.divisionFactor - 1) {
                            vertices.push(
                                xWorldSpace, yWorldSpace, zStart + 1.0,
                                xNextWorldSpace, yWorldSpace, zStart + 1.0,
                                xNextWorldSpace, yNextWorldSpace, zStart + 1.0,
                                xNextWorldSpace, yNextWorldSpace, zStart + 1.0,
                                xWorldSpace, yNextWorldSpace, zStart + 1.0,
                                xWorldSpace, yWorldSpace, zStart + 1.0
                            );
                            for (let i = 0; i < 6; i++) {
                                colors.push(cubeColor[0], cubeColor[1], cubeColor[2]);
                                normals.push(0.0, 0.0, 1.0);
                            }
                        }
                    }

                    if (cubeColor != undefined) {
                        yMax = Math.max(y, yMax);
                        yMin = Math.min(y, yMin);
                    }
                }
            }
        }
        this.cubeSpacePositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeSpacePositionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        this.cubeSpaceNormalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeSpaceNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        this.cubeSpaceColorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeSpaceColorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        this.cubeSpaceNumberOfVertices = vertices.length / 3;
        console.log("Number of vertices: " + vertices.length / 3);
        console.log("Number of colors: " + colors.length / 3);
        console.log("Number of normals: " + normals.length / 3);
        return vec2.fromValues(yMin, yMax);
    }
}