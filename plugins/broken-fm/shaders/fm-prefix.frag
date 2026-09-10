#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPrevious;
uniform vec2 uScanResolution;
uniform float uOffset;

void main() {
    vec2 sum = texture(uPrevious, vUv).rg;
    if (gl_FragCoord.x > uOffset) {
        vec2 previousUv = (gl_FragCoord.xy - vec2(uOffset, 0.0)) / uScanResolution;
        sum += texture(uPrevious, previousUv).rg;
    }
    fragColor = vec4(sum, 0.0, 1.0);
}
