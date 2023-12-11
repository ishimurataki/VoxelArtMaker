export const flatVertexShaderSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexColor;
    attribute vec3 aVertexNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uModelMatrix;

    varying lowp vec3 vPos;
    varying lowp vec3 vNorm;
    varying lowp vec3 vColor;

    void main() {
        vec4 world_pos = uModelMatrix * vec4(aVertexPosition, 1.0);
        gl_Position = uProjectionMatrix * uModelViewMatrix * world_pos;
        vPos = world_pos.xyz;
        vNorm = aVertexNormal;
        vColor = aVertexColor;
    }
`;
export const flatFragmentShaderSource = `
    precision mediump float;
    uniform vec3 uColor;
    uniform int uUseUniformColor;
    uniform vec3 uCameraPosition;

    varying lowp vec3 vPos;
    varying lowp vec3 vNorm;
    varying lowp vec3 vColor;

    void main() {
        if (uUseUniformColor == 1) { 
            gl_FragColor = vec4(uColor, 1.0);
        } else {
            vec3 lightColor = vec3(1.0, 1.0, 1.0);
            float ambientStrength = 0.5;
            vec3 ambient = ambientStrength * lightColor;

            vec3 norm = normalize(vNorm);
            vec3 pointLightPos = vec3(-5.0, 5.0, -5.0);
            vec3 lightDir = normalize(pointLightPos - vPos);

            float diffuseCoefficient = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diffuseCoefficient * lightColor;

            float specularStrength = 0.5;
            vec3 viewDir = normalize(uCameraPosition - vPos);
            vec3 reflectDir = reflect(-lightDir, norm);  

            float specularCoefficient = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
            vec3 specular = specularStrength * specularCoefficient * lightColor;

            vec3 result = (ambient + diffuse + specular) * vColor;
            gl_FragColor = vec4(result, 1.0);
        }
    }
`;
