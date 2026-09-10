#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform vec2 uOutputResolution;
uniform bool uUseVideo;

vec3 testPattern(vec2 uv) {
    float gradient = uv.x;
    float steps = floor(uv.x * 10.0) / 9.0;
    float split = step(0.52, uv.y);
    float value = mix(steps, gradient, split);

    vec2 centered = uv - 0.5;
    float aspect = uOutputResolution.x / max(uOutputResolution.y, 1.0);
    centered.x *= aspect;
    float circle = 1.0 - smoothstep(0.004, 0.008, abs(length(centered - vec2(0.22, 0.08)) - 0.17));
    float box = step(0.13, uv.x) * step(uv.x, 0.34) * step(0.17, uv.y) * step(uv.y, 0.37);
    float fineLines = step(0.5, fract(uv.x * 72.0));
    float lineRegion = step(0.67, uv.x) * step(uv.x, 0.92) * step(0.12, uv.y) * step(uv.y, 0.42);

    value = mix(value, 0.06, box);
    value = max(value, circle);
    value = mix(value, fineLines, lineRegion);

    float bar = floor(uv.x * 6.0);
    vec3 barColor = vec3(1.0, 0.0, 0.0);
    if (bar > 0.5) barColor = vec3(1.0, 1.0, 0.0);
    if (bar > 1.5) barColor = vec3(0.0, 1.0, 0.0);
    if (bar > 2.5) barColor = vec3(0.0, 1.0, 1.0);
    if (bar > 3.5) barColor = vec3(0.0, 0.0, 1.0);
    if (bar > 4.5) barColor = vec3(1.0, 0.0, 1.0);
    return mix(vec3(value), barColor, step(0.84, uv.y));
}

void main() {
    vec3 rgb = uUseVideo ? texture(uSource, vUv).rgb : testPattern(vUv);
    float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    fragColor = vec4(rgb, luma);
}
