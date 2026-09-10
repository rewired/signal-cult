#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uCurrentSignal;
uniform sampler2D uPreviousState;
uniform float uFeedbackDecay;
uniform vec2 uResolution;
uniform float uFeedbackDisplacement;
uniform float uFeedbackDisplacementAngle;

vec2 displacedPreviousState() {
    float angle = radians(uFeedbackDisplacementAngle);
    vec2 direction = vec2(cos(angle), sin(angle));
    vec2 uv = vUv - direction * uFeedbackDisplacement / uResolution;
    float inside = step(0.0, uv.x) * step(uv.x, 1.0)
                 * step(0.0, uv.y) * step(uv.y, 1.0);
    return texture(uPreviousState, clamp(uv, 0.0, 1.0)).rg * inside;
}

void main() {
    // The state stores bipolar waveform/quadrature components, not display RGB.
    vec2 currentSignal = texture(uCurrentSignal, vUv).rg;
    vec2 previousSignal = displacedPreviousState();
    vec2 state = mix(currentSignal, previousSignal, clamp(uFeedbackDecay, 0.0, 0.999));
    fragColor = vec4(state, 0.0, 1.0);
}
