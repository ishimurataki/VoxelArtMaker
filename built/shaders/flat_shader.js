export const flatVertexShaderSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute vec4 aVertexNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelMatrix;

    void main() {
        vec4 world_pos = uModelMatrix * aVertexPosition;
        gl_Position = uProjectionMatrix * uModelViewMatrix * world_pos;
    }
`;
export const flatFragmentShaderSource = `
    precision mediump float;
    uniform vec3 uColor;

    void main() {
        gl_FragColor = vec4(uColor, 1.0);
    }
`;
