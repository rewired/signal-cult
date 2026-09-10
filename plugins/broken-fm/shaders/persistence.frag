#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uCurrentSignal;
uniform sampler2D uPreviousPersistence;
uniform float uHalfLifeMs;
uniform float uFrameDelta;

const float PREVIEW_FRAME_MS = 1000.0 / 60.0;
const float LOG_TWO = 0.6931471805599453;

void main() {
    vec3 currentEmission = texture(uCurrentSignal, vUv).rgb;
    vec3 previousEmission = texture(uPreviousPersistence, vUv).rgb;
    float decay = uHalfLifeMs <= 0.0
        ? 0.0
        : exp(-LOG_TWO * PREVIEW_FRAME_MS * max(uFrameDelta, 1.0) / uHalfLifeMs);
    // Peak-hold decay models stored phosphor energy without feeding it back
    // into the signal, phase, modulation, or history paths.
    vec3 storedEmission = max(currentEmission, previousEmission * decay);
    fragColor = vec4(storedEmission, 1.0);
}
