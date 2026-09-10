#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uModulation;
uniform sampler2D uFeedbackState;
uniform vec2 uOutputResolution;
uniform vec2 uScanResolution;
uniform float uScanAngle;
uniform float uFrameIndex;
uniform float uSeed;
uniform float uDropout;
uniform float uDropoutAngle;
uniform float uFeedbackAmount;
uniform float uFeedbackPhase;
uniform int uDropoutStage;
uniform int uFeedbackInjection;

const float PREVIEW_FRAME_RATE = 60.0;
const float DROPOUT_BAND_PX = 12.0;
const float DROPOUT_RATE_HZ = 5.0;

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    float angle = radians(uScanAngle);
    vec2 scanDirection = normalize(vec2(cos(angle), sin(angle)));
    vec2 scanNormal = vec2(-scanDirection.y, scanDirection.x);

    // This texture is an atlas whose x axis follows the carrier scan direction.
    vec2 scanPosition = gl_FragCoord.xy - 0.5 * uScanResolution;
    vec2 outputPosition = scanDirection * scanPosition.x + scanNormal * scanPosition.y;
    vec2 outputUv = (outputPosition + 0.5 * uOutputResolution) / uOutputResolution;

    float inside = step(0.0, outputUv.x) * step(outputUv.x, 1.0)
                 * step(0.0, outputUv.y) * step(outputUv.y, 1.0);
    vec2 clampedUv = clamp(outputUv, 0.0, 1.0);
    float dryModulation = texture(uModulation, clampedUv).b - 0.5;
    float wetModulation = dryModulation;
    if (uFeedbackInjection == 1) {
        vec2 feedbackState = texture(uFeedbackState, clampedUv).rg;
        float feedbackAngle = 6.283185307179586 * uFeedbackPhase;
        float rotatedFeedback = dot(feedbackState, vec2(cos(feedbackAngle), sin(feedbackAngle)));
        wetModulation += rotatedFeedback * uFeedbackAmount;
    }

    float time = uFrameIndex / PREVIEW_FRAME_RATE;
    vec2 seedOffset = vec2(uSeed * 0.754877666, uSeed * 0.569840296);
    float dropoutAngle = radians(uDropoutAngle);
    vec2 dropoutDirection = normalize(vec2(cos(dropoutAngle), sin(dropoutAngle)));
    vec2 dropoutNormal = vec2(-dropoutDirection.y, dropoutDirection.x);
    float dropoutPositionPx = dot(outputPosition, dropoutNormal);
    float dropoutBand = floor(dropoutPositionPx / DROPOUT_BAND_PX);
    float dropoutTimeCell = floor(time * DROPOUT_RATE_HZ);
    float dropoutRandom = hash21(vec2(dropoutBand, dropoutTimeCell) + seedOffset + vec2(17.0, 53.0));
    float dropoutEvent = step(1.0 - clamp(uDropout, 0.0, 1.0) * 0.45, dropoutRandom);
    if (uDropoutStage == 0) {
        dryModulation *= 1.0 - dropoutEvent;
        wetModulation *= 1.0 - dropoutEvent;
    }
    // R is the dry field used by finite history; G is the routed wet field.
    fragColor = vec4(vec2(dryModulation, wetModulation) * inside, 0.0, 1.0);
}
