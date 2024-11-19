'use strict';
import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { v3, m4 } from './starter_3D_lib';
import vsGLSL from '../assets/shaders/vs_phong.glsl?raw';
import fsGLSL from '../assets/shaders/fs_phong.glsl?raw';

const settings = {
    // Speed in degrees
    rotationSpeed: {
        x: 0,
        y: 30,
        z: 0,
    },
    cameraPosition: {
        x: 0,
        y: 0,
        z: 10,
    },
    lightPosition: {
        x: 10,
        y: 10,
        z: 10,
    },
    ambientColor: [0.5, 0.5, 0.5, 1.0],
    diffuseColor: [0.5, 0.5, 0.5, 1.0],
    specularColor: [0.5, 0.5, 0.5, 1.0],
};

function setupWorldView(gl) {
    // Field of view of 60 degrees, in radians
    const fov = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Matrices for the world view
    const projectionMatrix = m4.perspective(fov, aspect, 1, 200);

    const cameraPosition = [settings.cameraPosition.x,
                            settings.cameraPosition.y,
                            settings.cameraPosition.z];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    const viewMatrix = m4.inverse(cameraMatrix);

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    return viewProjectionMatrix;
}

function drawScene(gl) {
    // Resize the canvas
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);


    const viewProjectionMatrix = setupWorldView(gl);

    // Use the program
    gl.useProgram(programInfo.program);

    
    // Update the model matrix
    requestAnimationFrame(() => drawScene(gl));
}

function setupUI(gl) {
    // Create the UI elements for each value
    const gui = new GUI();

    // Add the camera controls
}

(async function(){
    // Get the WebGL context
    const canvas = document.getElementById('city-canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error("Error: No WebGL context.");
    }

    // Set controllers for the camera and the scene
    setupUI(gl);

    // Create the program
    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    // Draw the scene
    drawScene(gl);
})();