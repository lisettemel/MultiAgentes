#version 300 es
precision mediump float;

// Varyings del vertex shader
in vec3 v_normal;
in vec3 v_position;

// Uniformes de iluminación
uniform vec3 u_lightPosition;
uniform vec4 u_ambientColor;   // Color ambiental específico del objeto
uniform vec4 u_diffuseColor;   // Color difuso específico del objeto
uniform vec4 u_specularColor;  // Color especular específico del objeto
uniform vec3 u_viewPosition;

// Salida de color
out vec4 outColor;

void main() {
    // Normaliza las normales
    vec3 normal = normalize(v_normal);

    // Vector desde el punto hasta la luz
    vec3 lightDir = normalize(u_lightPosition - v_position);

    // Vector desde el punto hasta la cámara
    vec3 viewDir = normalize(u_viewPosition - v_position);

    // Reflexión del vector de luz
    vec3 reflectDir = reflect(-lightDir, normal);

    // Componente ambiental
    vec4 ambient = u_ambientColor;

    // Componente difuso utilizando el color difuso específico del objeto
    float diff = max(dot(normal, lightDir), 0.0);
    vec4 diffuse = u_diffuseColor * diff;

    // Componente especular
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec4 specular = u_specularColor * spec;

    // Combina los componentes
    outColor = ambient + diffuse + specular;
}
