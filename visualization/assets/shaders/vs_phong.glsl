#version 300 es
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_matrix;

out vec3 v_normal;

void main() {
    gl_Position = u_matrix * a_position;
    v_normal = a_normal;
}
