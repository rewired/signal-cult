#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPreprocessed;
uniform vec2 uResolution;
uniform int uModSource;
uniform float uLumaGain;
uniform float uLumaBias;
uniform float uEdgeGain;
uniform float uLocalContrastGain;
uniform float uThreshold;
uniform float uThresholdSoftness;

const float LOCAL_CONTRAST_RADIUS_PX = 6.0;

void main() {
    vec2 texel = 1.0 / uResolution;
    float luma = texture(uPreprocessed, vUv).a;
    float left = texture(uPreprocessed, vUv - vec2(texel.x, 0.0)).a;
    float right = texture(uPreprocessed, vUv + vec2(texel.x, 0.0)).a;
    float down = texture(uPreprocessed, vUv - vec2(0.0, texel.y)).a;
    float up = texture(uPreprocessed, vUv + vec2(0.0, texel.y)).a;
    float edge = clamp(length(vec2(right - left, up - down)) * uEdgeGain, 0.0, 1.0);
    vec2 contrastOffset = texel * LOCAL_CONTRAST_RADIUS_PX;
    float neighborhood = (
        texture(uPreprocessed, vUv - vec2(contrastOffset.x, 0.0)).a
      + texture(uPreprocessed, vUv + vec2(contrastOffset.x, 0.0)).a
      + texture(uPreprocessed, vUv - vec2(0.0, contrastOffset.y)).a
      + texture(uPreprocessed, vUv + vec2(0.0, contrastOffset.y)).a
    ) * 0.25;
    float localContrast = clamp(abs(luma - neighborhood) * uLocalContrastGain, 0.0, 1.0);
    float shapedLuma = clamp(luma * uLumaGain + uLumaBias, 0.0, 1.0);

    float modulation = shapedLuma;
    if (uModSource == 1) modulation = edge;
    if (uModSource == 2) modulation = clamp(shapedLuma * 0.72 + edge * 0.65, 0.0, 1.0);
    if (uModSource == 3) modulation = 1.0 - shapedLuma;
    if (uModSource == 4) modulation = localContrast;

    // Threshold zero is an exact bypass, preserving the original modulation path.
    if (uThreshold > 0.0) {
        modulation = uThresholdSoftness > 0.00001
            ? smoothstep(uThreshold - uThresholdSoftness * 0.5, uThreshold + uThresholdSoftness * 0.5, modulation)
            : step(uThreshold, modulation);
    }

    // R: shaped luma, G: edge magnitude, B: selected source, A: local contrast.
    fragColor = vec4(shapedLuma, edge, modulation, localContrast);
}
