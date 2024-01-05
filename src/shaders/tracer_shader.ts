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
    uniform float uTimeSinceStart; 
    uniform float uTextureWeight;
    uniform vec3 uLightPos;
    uniform sampler2D uRenderTexture;
    uniform sampler2D uCubeSpaceTexture;
    uniform float uWidth;
    uniform float uHeight;
    uniform vec3 uBackgroundColor;
    uniform int uTracerMaterial;
    uniform float uDiffuseStrength;
    uniform float uAmbienceStrength;
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

    float random(vec3 scale, float seed) {
        return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
    }

    vec3 cosineWeightedDirection(float seed, vec3 normal) {
        float u = random(vec3(12.9898, 78.233, 151.7182), seed);
        float v = random(vec3(63.7264, 10.873, 623.6736), seed);
        float r = sqrt(u);
        float angle = 6.283185307179586 * v;
        // compute basis from normal
        vec3 sdir, tdir;
        if (abs(normal.x) < .5) {
            sdir = cross(normal, vec3(1,0,0));
        } else {
            sdir = cross(normal, vec3(0,1,0));
        }
        tdir = cross(normal, sdir);
        return r * cos(angle) * sdir + r * sin(angle) * tdir + sqrt(1.0 - u) * normal;
    }

    vec3 uniformlyRandomDirection(float seed) {
        float u = random(vec3(12.9898, 78.233, 151.7182), seed);
        float v = random(vec3(63.7264, 10.873, 623.6736), seed);
        float z = 1.0 - 2.0 * u;
        float r = sqrt(1.0 - z * z);
        float angle = 6.283185307179586 * v;
        return vec3(r * cos(angle), r * sin(angle), z);
    }

    vec3 uniformlyRandomVector(float seed) {
        return uniformlyRandomDirection(seed) * sqrt(random(vec3(36.7539, 50.3658, 306.2759), seed));
    }

    float calculateShadowStrength(vec3 origin, vec3 toLight, float tLight) {
        int divisionFactor = ${divisionFactor.toFixed(0)};

        int stepX = (toLight.x > 0.0) ? 1 : -1;
        int stepY = (toLight.y > 0.0) ? 1 : -1;
        int stepZ = (toLight.z > 0.0) ? 1 : -1;

        float t = 0.0;
        vec3 intersectPoint = origin;
        vec3 intersectPointLocalized = float(divisionFactor) * vec3(intersectPoint.x + 0.5, intersectPoint.y, intersectPoint.z + 0.5);

        int x = int(floor(intersectPointLocalized.x));
        int y = int(floor(intersectPointLocalized.y));
        int z = int(floor(intersectPointLocalized.z));

        float nextX = (stepX == 1) ? ceil(intersectPointLocalized.x) : floor(intersectPointLocalized.x);
        float nextY = (stepY == 1) ? ceil(intersectPointLocalized.y) : floor(intersectPointLocalized.y);
        float nextZ = (stepZ == 1) ? ceil(intersectPointLocalized.z) : floor(intersectPointLocalized.z);

        float tMaxX = (nextX - intersectPointLocalized.x) / toLight.x;
        float tMaxY = (nextY - intersectPointLocalized.y) / toLight.y;
        float tMaxZ = (nextZ - intersectPointLocalized.z) / toLight.z;

        float tDeltaX = float(stepX) / toLight.x;
        float tDeltaY = float(stepY) / toLight.y;
        float tDeltaZ = float(stepZ) / toLight.z;

        for (int i = 0; i < ${(divisionFactor * 3).toFixed(0)}; i++) {
            if (x >= divisionFactor || x < 0 || 
                y >= divisionFactor || y < 0 || 
                z >= divisionFactor || z < 0 ||
                t > tLight) {
                return 0.0;
            }
            float textureX = float(divisionFactor * x + z) / 
                float(divisionFactor * divisionFactor);
            float textureY = float(y) / float(divisionFactor);
            vec4 cubeColor = texture2D(uCubeSpaceTexture, vec2(textureX, textureY));
            if (cubeColor.a == 1.0) {
                return 1.0;
            }
            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    x += stepX;
                    t = (tMaxX / float(divisionFactor));
                    tMaxX = tMaxX + tDeltaX;
                } else {
                    z += stepZ;
                    t = (tMaxZ / float(divisionFactor));
                    tMaxZ = tMaxZ + tDeltaZ;
                }
            } else {
                if (tMaxY < tMaxZ) {
                    y += stepY;
                    t = (tMaxY / float(divisionFactor));
                    tMaxY = tMaxY + tDeltaY;
                } else {
                    z += stepZ;
                    t = (tMaxZ / float(divisionFactor));
                    tMaxZ = tMaxZ + tDeltaZ;
                }
            }
        }
        return 0.0;
    }

    void main() {
        int divisionFactor = ${divisionFactor.toFixed(0)};
        float sideLength = 1.0 / float(divisionFactor);
        vec3 cubeMin = vec3(-0.5, 0.0, -0.5);
        vec3 cubeMax = vec3(0.5, 1.0, 0.5);
        vec3 accumulatedColor = vec3(0.0);
        vec3 ray = normalize(initialRay);
        vec3 origin = uEye;
        vec3 colorMask = vec3(1.0);
        bool atLeastOneHit = false;

        vec3 sunCubeMin = uLightPos + vec3(-sideLength / 2.0, -sideLength / 2.0, -sideLength / 2.0);
        vec3 sunCubeMax = uLightPos + vec3(sideLength / 2.0, sideLength / 2.0, sideLength / 2.0);
        vec2 tSunCube = intersectCube(origin, ray, sunCubeMin, sunCubeMax);
        float tSun = -1.0;
        if (tSunCube.x < tSunCube.y && tSunCube.x > 0.0) {
            tSun = tSunCube.x;
        }
        bool sunHit = false;

        for (int bounce = 0; bounce < 5; bounce++) {
            vec2 tCube = intersectCube(origin, ray, cubeMin, cubeMax);
            if (tCube.x > tCube.y) {
                accumulatedColor = uBackgroundColor;
                break;
            }
            if (tCube.y < 0.0) {
                break;
            }
            float t = max(0.0, tCube.x);
            float initialT = t;
            int stepX = (ray.x > 0.0) ? 1 : -1;
            int stepY = (ray.y > 0.0) ? 1 : -1;
            int stepZ = (ray.z > 0.0) ? 1 : -1;

            vec3 intersectPoint = (t + 0.00001) * ray + origin;
            vec3 nextOrigin = (t - 0.00001) * ray + origin;
            vec3 intersectPointLocalized = float(divisionFactor) * vec3(intersectPoint.x + 0.5, intersectPoint.y, intersectPoint.z + 0.5);

            int x = int(intersectPointLocalized.x);
            int y = int(intersectPointLocalized.y);
            int z = int(intersectPointLocalized.z);

            int hitDim;
            if ((stepX == 1 && abs(intersectPointLocalized.x - float(x)) < 0.001) || 
                (stepX == -1 && abs(intersectPointLocalized.x - float(x + 1)) < 0.001)) {
                hitDim = 1;
            } else if ((stepY == 1 && abs(intersectPointLocalized.y - float(y)) < 0.001) || 
                (stepY == -1 && abs(intersectPointLocalized.y - float(y + 1)) < 0.001)) {
                hitDim = 2;
            } else {
                hitDim = 3;
            }

            float nextX = (stepX == 1) ? ceil(intersectPointLocalized.x) : floor(intersectPointLocalized.x);
            float nextY = (stepY == 1) ? ceil(intersectPointLocalized.y) : floor(intersectPointLocalized.y);
            float nextZ = (stepZ == 1) ? ceil(intersectPointLocalized.z) : floor(intersectPointLocalized.z);

            float tMaxX = (nextX - intersectPointLocalized.x) / ray.x;
            float tMaxY = (nextY - intersectPointLocalized.y) / ray.y;
            float tMaxZ = (nextZ - intersectPointLocalized.z) / ray.z;

            float tDeltaX = float(stepX) / ray.x;
            float tDeltaY = float(stepY) / ray.y;
            float tDeltaZ = float(stepZ) / ray.z;

            bool found = false;
            vec3 surfaceColor = uBackgroundColor;
            vec3 normal; 
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
                    if (tSun > 0.0 && tSun < t) {
                        sunHit = true;
                        break;
                    }
                    tSun = -1.0;

                    found = true;
                    nextOrigin = (t - 0.001) * ray + origin;
                    surfaceColor = cubeColor.rgb;
                    if (hitDim == 1) {
                        normal = (stepX < 0) ? vec3(1.0, 0.0, 0.0) : vec3(-1.0, 0.0, 0.0); 
                    } else if (hitDim == 2) {
                        normal = (stepY < 0) ? vec3(0.0, 1.0, 0.0) : vec3(0.0, -1.0, 0.0); 
                    } else {
                        normal = (stepZ < 0) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 0.0, -1.0); 
                    }
                    float seed = uTimeSinceStart - (1000.0 * floor(uTimeSinceStart / 1000.0));
                    float rand = random(vec3(12.9898, 78.233, 151.7182), seed);
                    if (uTracerMaterial == 1 && rand > 0.1) {
                        ray = reflect(ray, normal);
                    } else {
                        ray = cosineWeightedDirection(seed + float(bounce), normal);
                    }
                    break;
                }
                if (tMaxX < tMaxY) {
                    if (tMaxX < tMaxZ) {
                        x += stepX;
                        t = initialT + (tMaxX / float(divisionFactor));
                        tMaxX = tMaxX + tDeltaX;
                        hitDim = 1;
                    } else {
                        z += stepZ;
                        t = initialT + (tMaxZ / float(divisionFactor));
                        tMaxZ = tMaxZ + tDeltaZ;
                        hitDim = 3;
                    }
                } else {
                    if (tMaxY < tMaxZ) {
                        y += stepY;
                        t = initialT + (tMaxY / float(divisionFactor));
                        tMaxY = tMaxY + tDeltaY;
                        hitDim = 2;
                    } else {
                        z += stepZ;
                        t = initialT + (tMaxZ / float(divisionFactor));
                        tMaxZ = tMaxZ + tDeltaZ;
                        hitDim = 3;
                    }
                }
            }
            if (found) {
                atLeastOneHit = true;
            } else {
                break;
            }

            vec3 toLight = uLightPos + (0.05 * uniformlyRandomVector(uTimeSinceStart - 53.0) * 0.01) - nextOrigin;
            vec3 toLightNorm = normalize(toLight);
            float tLight = length(toLight);

            float shadowStrength = calculateShadowStrength(nextOrigin, toLightNorm, tLight);

            float diffuse = max(0.0, dot(toLightNorm, normal));

            colorMask *= surfaceColor;
            accumulatedColor += colorMask * uAmbienceStrength;
            accumulatedColor += colorMask * uDiffuseStrength * (1.0 - shadowStrength) * diffuse;

            origin = nextOrigin;
        }
        if (sunHit) {
            accumulatedColor = vec3(1.0, 1.0, 1.0);
        } else if (!atLeastOneHit) {
            if (tSun > 0.0) {
                accumulatedColor = vec3(1.0, 1.0, 1.0);
            } else {
                accumulatedColor = uBackgroundColor;
            }
        }
        vec2 texCoord = vec2(gl_FragCoord.x / uWidth, gl_FragCoord.y / uHeight);
        vec3 texture = texture2D(uRenderTexture, texCoord).rgb;
        gl_FragColor = vec4(mix(accumulatedColor, texture, uTextureWeight), 1.0);
    }
`
}