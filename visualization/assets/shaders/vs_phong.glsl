#version 300 es

// Atributos de entrada
in vec4 a_position;
in vec3 a_normal;
in vec4 a_color;
in vec2 a_texCoord;

// Uniformes
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_lightWorldPosition;

// Varyings para pasar al fragment shader
out vec3 v_normal;
out vec3 v_surfaceToLight;
out vec3 v_surfaceToCamera;
out vec4 v_color;

void main() {
    // Transformar la posición del vértice al espacio de clip
    gl_Position = u_worldViewProjection * a_position;

    // Transformar la normal al espacio mundial
    v_normal = mat3(u_worldInverseTranspose) * a_normal;

    // Calcular la posición del vértice en el espacio mundial
    vec3 surfaceWorldPosition = (u_worldViewProjection * a_position).xyz;

    // Vector de la superficie hacia la luz
    v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;

    // Vector de la superficie hacia la cámara (asumimos que está en el origen)
    v_surfaceToCamera = -surfaceWorldPosition;

    // Pasar el color al fragment shader
    v_color = a_color;
}
