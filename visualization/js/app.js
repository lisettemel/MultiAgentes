"use strict";
import * as twgl from 'twgl-base.js';
import GUI from "lil-gui";
import { v3, m4 } from "./starter_3D_lib";
import vsGLSL from "../assets/shaders/vs_phong.glsl?raw";
import fsGLSL from "../assets/shaders/fs_phong.glsl?raw";

// Define the Object3D class to represent 3D objects
class Object3D {
    constructor(
        id,
        position = [0, 0, 0],
        rotation = [0, 0, 0],
        scale = [1, 1, 1]
    ) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.matrix = m4.identity();
    }
}

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";
// Initialize WebGL-related variables
let gl,
    programInfo,
    carsArrays,
    buildingsArrays,
    roadsArrays,
    trafficLightsArrays,
    destinationsArrays,
    carsBufferInfo,
    buildingsBufferInfo,
    roadsBufferInfo,
    trafficLightsBufferInfo,
    destinationsBufferInfo,
    carsVao,
    buildingsVao,
    roadsVao,
    trafficLightsVao,
    destinationsVao;
// Define the arrays for the objects in the scene
let cars = [];
let buildings = [];
let roads = [];
let trafficLights = [];
let destinations = [];
// Initialize the frame count
let frameCount = 0;
// Define the data object
const data = {
    NAgents: 500,
    width: 100,
    height: 100,
};

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
    const fov = (60 * Math.PI) / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Matrices for the world view
    const projectionMatrix = m4.perspective(fov, aspect, 1, 200);

    const cameraPosition = [
        settings.cameraPosition.x,
        settings.cameraPosition.y,
        settings.cameraPosition.z,
    ];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    const viewMatrix = m4.inverse(cameraMatrix);

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    return viewProjectionMatrix;
}

async function drawScene(gl) {
    // Resize the canvas to match the display size
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // Set the clear color and enable depth testing
    gl.clearColor(0.96, 0.95, 0.96, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // Clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the program
    gl.useProgram(programInfo.program);
    // Set up the view-projection matrix
    const viewProjectionMatrix = setupWorldView(gl);

    // Draw all objects in the scene

    // Increment the frame count
    frameCount++;

    // Update the scene every 30 frames
    if (frameCount % 30 == 0) {
        frameCount = 0;
        //   await update()
    }

    // Request the next frame
    requestAnimationFrame(() => drawScene(gl));
}

function setupUI(gl) {
    // Create the UI elements for each value
    const gui = new GUI();

    // Add the camera controls
}

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
    try {
        // Send a POST request to the agent server to initialize the model
        let response = await fetch(agent_server_uri + "init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON and log the message
            let result = await response.json();
            console.log(result);
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

/*
 * Retrieves the current positions of all objects from the agent server.
 */
async function getCity() {
    try {
        // Send a GET request to the agent server to retrieve the city objects positions
        let response = await fetch(agent_server_uri + "get-city");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Create new objects and add them to the object arrays
            for (const building in result.buildings){
                const newBuilding = new Object3D(building.id, [building.x, building.y, building.z])
                buildings.push(newBuilding)
            }
            for (const road in result.roads){
                const newRoad = new Object3D(road.id, [road.x, road.y, road.z])
                roads.push(newRoad)
            }
            for (const trafficLight in result.trafficLights){
                const newTrafficLight = new Object3D(trafficLight.id, [trafficLight.x, trafficLight.y, trafficLight.z])
                trafficLights.push(newTrafficLight)
            }
            for (const destination in result.destinations){
                const newDestination = new Object3D(destination.id, [destination.x, destination.y, destination.z])
                destinations.push(newDestination)
            }
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

function drawCity(gl, viewProjectionMatrix) {
    // Bind the vertex array object for all the city objects
    gl.bindVertexArray(buildingsVao);
    gl.bindVertexArray(roadsVao);
    gl.bindVertexArray(trafficLightsVao);
    gl.bindVertexArray(destinationsVao);

    
    // Set the model matrix for the buildings
    buildings.forEach((building) => {
        
    });

}

(async function () {
    // Get the WebGL context
    const canvas = document.getElementById("city-canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("Error: No WebGL context.");
    }

    // Create the program
    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    // Set the view and projection matrices
    const viewProjectionMatrix = setupWorldView(gl);

    // Generate the agent and obstacle data
    // carsArrays = generateData(1);

    // Create buffer information from the agent and obstacle data
    // carsBufferInfo = twgl.createBufferInfoFromArrays(gl, carsArrays);
    // buildingsBufferInfo = twgl.createBufferInfoFromArrays(gl, buildingsArrays);
    // roadsBufferInfo = twgl.createBufferInfoFromArrays(gl, roadsArrays);
    // trafficLightsBufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightsArrays);
    // destinationsBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    // carsVao = twgl.createVAOFromBufferInfo(gl, programInfo, carsBufferInfo);
    // buildingsVao = twgl.createVAOFromBufferInfo(gl, programInfo, buildingsBufferInfo);
    // roadsVao = twgl.createVAOFromBufferInfo(gl, programInfo, roadsBufferInfo);
    // trafficLightsVao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightsBufferInfo);
    // destinationsVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationsBufferInfo);

    // Set controllers for the camera and the scene
    // setupUI(gl);

    // Initialize the agents model
    await initAgentsModel();

    // Get the city objects
    await getCity();
    
    drawCity(gl, viewProjectionMatrix);

    // Draw the scene
    await drawScene(gl);
})();
