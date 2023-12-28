export const tracerVertexSource: string = `
    attribute vec3 aVertexPosition;
    uniform vec3 uRay00, uRay01, uRay10, uRay11;
    varying vec3 initialRay;
    void main() {
        vec2 percent = aVertexPosition.xy * 0.5 + 0.5;
        initialRay = mix(mix(uRay00, uRay01, percent.y), mix(uRay10, uRay11, percent.y), percent.x);
        gl_Position = vec4(aVertexPosition, 1.0);
    }
`

export const tracerFragmentSource = (divisionFactor: number) => {
    return `
    precision highp float;
    uniform vec3 uEye;
    uniform sampler2D uCubeSpaceTexture;
    varying vec3 initialRay;

    vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {
        vec3 t1 = (cubeMin - origin) / ray;
        vec3 t2 = (cubeMax - origin) / ray;
        
        vec3 tMin = min(t1, t2);
        vec3 tMax = max(t1, t2);

        float tNear = max(tMin.x, max(tMin.y, tMin.z));
        float tFar = min(tMax.x, min(tMax.y, tMax.z));

        return vec2(tNear, tFar);
    }

    void main() {
        int divisionFactor = ${divisionFactor.toFixed(0)};
        vec3 initialRayNormalized = normalize(initialRay);
        vec3 cubeMin = vec3(-0.5, 0.0, -0.5);
        vec3 cubeMax = vec3(0.5, 1.0, 0.5);
        vec2 tCube = intersectCube(uEye, initialRayNormalized, cubeMin, cubeMax);

        if (tCube.x < tCube.y) {
            int stepX = (initialRayNormalized.x > 0.0) ? 1 : -1;
            int stepY = (initialRayNormalized.y > 0.0) ? 1 : -1;
            int stepZ = (initialRayNormalized.z > 0.0) ? 1 : -1;

            vec3 intersectPoint = (tCube.x + 0.00001) * initialRayNormalized + uEye;
            vec3 intersectPointLocalized = float(divisionFactor) * vec3(intersectPoint.x + 0.5, intersectPoint.y, intersectPoint.z + 0.5);

            int x = int(intersectPointLocalized.x);
            int y = int(intersectPointLocalized.y);
            int z = int(intersectPointLocalized.z);

            float nextX = (stepX == 1) ? ceil(intersectPointLocalized.x) : floor(intersectPointLocalized.x);
            float nextY = (stepY == 1) ? ceil(intersectPointLocalized.y) : floor(intersectPointLocalized.y);
            float nextZ = (stepZ == 1) ? ceil(intersectPointLocalized.z) : floor(intersectPointLocalized.z);

            float tMaxX = (nextX - intersectPointLocalized.x) / initialRayNormalized.x;
            float tMaxY = (nextY - intersectPointLocalized.y) / initialRayNormalized.y;
            float tMaxZ = (nextZ - intersectPointLocalized.z) / initialRayNormalized.z;

            float tDeltaX = float(stepX) / initialRayNormalized.x;
            float tDeltaY = float(stepY) / initialRayNormalized.y;
            float tDeltaZ = float(stepZ) / initialRayNormalized.z;

            bool found = false;
            for (int i = 0; i < ${(divisionFactor * 3).toFixed(0)}; i++) {
                if (x >= divisionFactor || x < 0 || 
                    y >= divisionFactor || y < 0 || 
                    z >= divisionFactor || z < 0) {
                    break;
                }
                float textureX = float(divisionFactor * x + z) / 
                    float(divisionFactor * divisionFactor);
                float textureY = float(y) / float(divisionFactor);

                vec4 cubeColor = texture2D(uCubeSpaceTexture, vec2(textureX, textureY));
                if (cubeColor.a == 1.0) {
                    gl_FragColor = cubeColor;
                    found = true;
                    break;
                }
                if (tMaxX < tMaxY) {
                    if (tMaxX < tMaxZ) {
                        x += stepX;
                        tMaxX = tMaxX + tDeltaX;
                    } else {
                        z += stepZ;
                        tMaxZ = tMaxZ + tDeltaZ;
                    }
                } else {
                    if (tMaxY < tMaxZ) {
                        y += stepY;
                        tMaxY = tMaxY + tDeltaY;
                    } else {
                        z += stepZ;
                        tMaxZ = tMaxZ + tDeltaZ;
                    }
                }
            }
            if (!found) {
                gl_FragColor = vec4(0, 0, 0, 1);
            }
        } else {
            gl_FragColor = vec4(0, 0, 0, 1);
        }
    }
`
}