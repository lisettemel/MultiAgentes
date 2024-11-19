#version 300 es
precision highp float;

// Varyings de entrada desde el vertex shader
in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToCamera;
in vec4 v_color;

// Uniformes de iluminación
uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;
uniform float u_shininess;

// Color final de salida
out vec4 outColor;

void main() {
    // Normalizar vectores
    vec3 normal = normalize(v_normal);
    vec3 surfaceToLightDir = normalize(v_surfaceToLight);
    vec3 surfaceToCameraDir = normalize(v_surfaceToCamera);

    // Cálculo de la luz ambiente
    vec4 ambient = u_ambientLight * v_color;

    // Cálculo de la luz difusa
    float light = max(dot(normal, surfaceToLightDir), 0.0);
    vec4 diffuse = u_diffuseLight * v_color * light;

    // Cálculo de la luz especular
    vec3 halfVector = normalize(surfaceToLightDir + surfaceToCameraDir);
    float specularFactor = pow(max(dot(normal, halfVector), 0.0), u_shininess);
    vec4 specular = u_specularLight * specularFactor;

    // Combinar componentes de iluminación
    outColor = ambient + diffuse + specular;

    // Asegurar que el color no exceda el rango [0,1]
    outColor = clamp(outColor, 0.0, 1.0);
}
