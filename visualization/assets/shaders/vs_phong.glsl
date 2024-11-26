#version 300 es

precision mediump float;

// Atributos
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

// Uniformes
uniform mat4 u_matrix;
uniform mat4 u_normalMatrix;

// Varyings (para pasar al fragment shader)
out vec3 v_normal;
out vec3 v_position;
out vec2 v_texcoord;

void main() {
    // Calcula la posición del vértice en el espacio del mundo
    gl_Position = u_matrix * a_position;

    // Calcula la normal transformada al espacio del mundo
    v_normal = mat3(u_normalMatrix) * a_normal;

    // Posición en el espacio del mundo (sin perspectiva)
    v_position = (u_matrix * a_position).xyz;

    // Pasar las coordenadas de textura
    v_texcoord = a_texcoord;
}
