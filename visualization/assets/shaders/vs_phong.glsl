#version 300 es

// Atributos de entrada
in vec4 a_position; // Posición del vértice
in vec3 a_normal;   // Normal del vértice
in vec4 a_color;    // Color del vértice

// Uniformes
uniform mat4 u_matrix;       // Matriz modelo-vista-proyección (MVP)
uniform mat4 u_modelMatrix;  // Matriz de modelo
uniform mat4 u_normalMatrix; // Matriz para transformar las normales

// Salidas para el Fragment Shader
out vec3 v_normal;    // Normal transformada
out vec3 v_position;  // Posición en espacio de mundo
out vec4 v_color;     // Color del vértice

void main() {
    // Transformar la posición del vértice al espacio de mundo
    v_position = (u_modelMatrix * a_position).xyz;

    // Transformar la posición del vértice al clip space
    gl_Position = u_matrix * a_position;

    // Transformar la normal al espacio de mundo
    v_normal = mat3(u_normalMatrix) * a_normal;

    // Pasar el color al Fragment Shader
    v_color = a_color;
}
