#version 300 es

precision mediump float;

// Varyings recibidos del vertex shader
in vec3 v_normal;
in vec3 v_position;
in vec2 v_texcoord;

// Uniformes
uniform vec3 u_lightDirection;   // Dirección de la luz
uniform vec4 u_ambientColor;     // Color ambiente
uniform vec4 u_diffuseColor;     // Color difuso
uniform vec4 u_specularColor;    // Color especular
uniform sampler2D u_diffuseMap;  // Mapa de texturas
uniform int u_hasTexture;        // Indicador si hay textura

// Color final del píxel
out vec4 outColor;

void main() {
    // Normalización de las normales
    vec3 normal = normalize(v_normal);

    // Calcular la luz ambiente
    vec4 ambient = u_ambientColor;

    // Calcular la luz difusa
    float light = max(dot(normal, -u_lightDirection), 0.0);
    vec4 diffuse = u_diffuseColor * light;

    // Calcular la luz especular
    vec3 viewDir = normalize(-v_position); // Asumiendo cámara en el origen
    vec3 reflectDir = reflect(u_lightDirection, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0); // Brillo (32.0)
    vec4 specular = u_specularColor * spec;

    // Combinar los componentes
    vec4 color = ambient + diffuse + specular;

    // Aplicar textura si está disponible
    if (u_hasTexture == 1) {
        vec4 textureColor = texture(u_diffuseMap, v_texcoord);
        color *= textureColor;
    }

    // Salida final del color
    outColor = vec4(color.rgb, 1.0);
}
