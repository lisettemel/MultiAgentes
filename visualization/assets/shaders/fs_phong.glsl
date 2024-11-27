#version 300 es

precision mediump float;

// Uniformes
uniform vec4 u_ambientColor; // Luz ambiental
uniform vec4 u_diffuseColor; // Luz difusa
uniform vec4 u_specularColor; // Luz especular
uniform float u_shininess; // Brillo especular
uniform vec3 u_lightPosition; // Posición de la luz
uniform vec3 u_viewPosition; // Posición de la cámara (observador)
uniform float u_lightIntensity; // Intensidad de la luz

// Varyings (desde el vertex shader)
in vec3 v_normal;
in vec3 v_position;
in vec4 v_color; // Color del vértice
in vec2 v_texcoord;

// Salida del color
out vec4 outColor;

void main() {

    // Atenuación basada en la distancia
    float distance = length(u_lightPosition - v_position);
    float attenuation = 1.0 / (0.1 + 0.1 * distance + 0.01 * distance * distance);

    // Normalización de los vectores
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(u_lightPosition - v_position); // Dirección de la luz
    vec3 viewDir = normalize(u_viewPosition - v_position); // Dirección del observador

    // Componente ambiental
    vec4 ambient = u_ambientColor * v_color ;

    // Componente difusa (modelo de Lambert)
    float diff = max(dot(normal, lightDir), 2.0);
    vec4 diffuse = u_diffuseColor * diff * v_color * u_lightIntensity * attenuation;

    // Componente especular (modelo de Phong)
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    vec4 specular = u_specularColor * spec * u_lightIntensity * attenuation;

    // Color final combinando los tres componentes
    outColor = ambient + diffuse + specular;
}
