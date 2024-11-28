#version 300 es
precision mediump float;

// Atributos de entrada
in vec4 a_position;
in vec3 a_normal;

// Uniformes
uniform mat4 u_matrix;

// Varyings para el fragment shader
out vec3 v_normal;
out vec3 v_position;

void main() {
    // Calcula la posición del vértice en el espacio de mundo
    gl_Position = u_matrix * a_position;
    v_position = vec3(u_matrix * a_position);
    
    // Calcula la normal en el espacio de mundo
    v_normal = mat3(u_matrix) * a_normal;
}
