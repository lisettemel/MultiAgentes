#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_cameraDirection;
in vec3 v_lightDirection;

// Light Uniforms
uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

// Material Uniforms
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

out vec4 outColor;

void main() {
    vec4 ambient = u_ambientLight * u_ambientColor;

    // Diffuse component
    // Normalize the vectors
    vec3 normalVector = normalize(v_normal);
    vec3 lightVector = normalize(v_lightDirection);
    float lambert = dot(normalVector, lightVector);
    vec4 diffuse = vec4(0,0,0,1);

    if (lambert > 0.0){
        diffuse = u_diffuseColor * u_diffuseLight * lambert;
    }

    // Specular color
    vec3 v_parallel = normalVector * lambert;
    vec3 v_perpendicular = lightVector - v_parallel;
    vec3 v_reflect = v_parallel - v_perpendicular;
    vec3 cameraVector = normalize(v_cameraDirection);

    float something = pow(dot(cameraVector,v_reflect),u_shininess);

    vec4 specular = vec4(0,0,0,1);

    if(something > 0.0){
        specular = u_specularColor * u_specularLight * something;
    }


    outColor = ambient + diffuse + specular;
}