#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uCurrentSignal;

void main() {
    vec2 signal = texture(uCurrentSignal, vUv).rg;
    fragColor = vec4(signal, 0.0, 1.0);
}
