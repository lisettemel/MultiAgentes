#version 300 es
precision highp float;

in vec3 v_normal;

out vec4 outColor;

void main() {
    vec3 color = normalize(v_normal) * 0.5 + 0.5; // Sombreado simple
    outColor = vec4(color, 1.0);
}
