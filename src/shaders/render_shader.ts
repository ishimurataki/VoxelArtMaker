export const renderVertexSource: string = `
    attribute vec3 aVertexPosition;
    varying vec2 texCoord;
    void main() {
        texCoord = aVertexPosition.xy * 0.5 + 0.5;
        gl_Position = vec4(aVertexPosition, 1.0);
    }
`;

export const renderFragmentSource: string = `
    precision highp float;
    varying vec2 texCoord;
    uniform sampler2D uRenderTexture;
    void main() {
        gl_FragColor = texture2D(uRenderTexture, texCoord);
    }
`