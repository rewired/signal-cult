#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSignal;

void main() {
    fragColor = vec4(texture(uSignal, vUv).rgb, 1.0);
}
