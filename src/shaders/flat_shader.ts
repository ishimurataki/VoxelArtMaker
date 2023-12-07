export const flatVertexShaderSource: string = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexColor;
    attribute vec4 aVertexNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelMatrix;

    varying lowp vec3 vColor;

    void main() {
        vec4 world_pos = uModelMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * uModelViewMatrix * world_pos;
        vColor = aVertexColor;
    }
`;

export const flatFragmentShaderSource: string = `
    precision mediump float;
    uniform vec3 uColor;
    uniform int uUseUniformColor;

    varying lowp vec3 vColor;

    void main() {
        if (uUseUniformColor == 1) {
            gl_FragColor = vec4(uColor, 1.0);
        } else {
            gl_FragColor = vec4(vColor, 1.0);
        }
    }
`