#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uHistory0;
uniform sampler2D uHistory1;
uniform sampler2D uHistory2;
uniform sampler2D uHistory3;
uniform sampler2D uHistory4;
uniform sampler2D uHistory5;
uniform sampler2D uHistory6;
uniform sampler2D uHistory7;
uniform int uWindowLength;
uniform int uAvailableFrames;
uniform float uDecay;
uniform vec2 uResolution;
uniform float uFeedbackDisplacement;
uniform float uFeedbackDisplacementAngle;

vec2 displacedTap(sampler2D history, int index) {
    float angle = radians(uFeedbackDisplacementAngle);
    vec2 direction = vec2(cos(angle), sin(angle));
    vec2 uv = vUv - direction * uFeedbackDisplacement * float(index + 1) / uResolution;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0)
                 * step(0.0, uv.y) * step(uv.y, 1.0);
    return texture(history, clamp(uv, 0.0, 1.0)).rg * inside;
}

void addTap(sampler2D history, int index, inout vec2 sum, inout float weightSum) {
    if (index < uWindowLength && index < uAvailableFrames) {
        float weight = pow(clamp(uDecay, 0.0, 0.999), float(index));
        sum += displacedTap(history, index) * weight;
        weightSum += weight;
    }
}

void main() {
    vec2 sum = vec2(0.0);
    float weightSum = 0.0;
    addTap(uHistory0, 0, sum, weightSum);
    addTap(uHistory1, 1, sum, weightSum);
    addTap(uHistory2, 2, sum, weightSum);
    addTap(uHistory3, 3, sum, weightSum);
    addTap(uHistory4, 4, sum, weightSum);
    addTap(uHistory5, 5, sum, weightSum);
    addTap(uHistory6, 6, sum, weightSum);
    addTap(uHistory7, 7, sum, weightSum);
    vec2 state = weightSum > 0.0 ? sum / weightSum : vec2(0.0);
    fragColor = vec4(state, 0.0, 1.0);
}
