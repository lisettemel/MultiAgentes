"use strict";
import * as twgl from 'twgl.js';
import GUI from "lil-gui";
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
        this.matrix = twgl.m4.create();
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
let data = {
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
        x: 20,
        y: 20,
        z: 20,
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

/*
 * Sets up the view-projection matrix for the scene.
 */
function setupWorldView(gl) {
    // Set the field of view (FOV) in radians
    const fov = 45 * Math.PI / 180;
    // Calculate the aspect ratio of the canvas
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    // Create the projection matrix
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 500);
    // Set the target position
    const target = [data.width/2, 0, data.height/2];
    // Set the up vector
    const up = [0, 1, 0];
    // Calculate the camera position
    const camPos = twgl.v3.create(settings.cameraPosition.x + data.width/2, settings.cameraPosition.y, settings.cameraPosition.z+data.height/2)
    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);
    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);
    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);
    // Return the view-projection matrix
    return viewProjectionMatrix;
}

/*
 * Draws the scene in the WebGL context.
 */
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
    drawBuildings(gl, viewProjectionMatrix);
    drawRoads(gl, viewProjectionMatrix);
    drawTrafficLights(gl, viewProjectionMatrix);
    drawDestinations(gl, viewProjectionMatrix);

    // Increment the frame count
    frameCount++;

    // Update the scene every 30 frames
    if(frameCount%30 == 0){
      frameCount = 0
    } 

    // Request the next frame
    requestAnimationFrame(() => drawScene(gl));
}

/*
 * Sets up the user interface (UI) for the scene (controllers).
 */
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
            data.width = result.width;
            data.height = result.height;

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
        console.log("Fetching city data...");
        // Send a GET request to the agent server to retrieve the city objects positions
        let response = await fetch(agent_server_uri + "get-city");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();
            console.log("City data received:", result);

            // Create new objects and add them to the object arrays
            result.buildings.forEach((building) => {
                const newBuilding = new Object3D(building.id, [building.x, building.y, building.z]);
                buildings.push(newBuilding);
            });
            result.roads.forEach((road) => {
                const newRoad = new Object3D(road.id, [road.x, road.y, road.z])
                roads.push(newRoad)
            });
            result.trafficLights.forEach((trafficLight) => {
                const newTrafficLight = new Object3D(trafficLight.id, [trafficLight.x, trafficLight.y, trafficLight.z])
                trafficLights.push(newTrafficLight)
            });
            result.destinations.forEach((destination) => {
                const newDestination = new Object3D(destination.id, [destination.x, destination.y, destination.z])
                destinations.push(newDestination)
            });
        }
        else{
            console.log("Error fetching city data:", response.status);
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

async function loadObj(input) {
    try {
        let objText;

        if (typeof input === "string" && input.trim().startsWith("v ")) {
            // Si el input es un contenido OBJ directamente
            console.log("Contenido OBJ recibido directamente.");
            objText = input;
        } else if (typeof input === "string") {
            // Si el input es un URL, intenta cargarlo
            console.log(`Intentando cargar desde URL: ${input}`);
            const response = await fetch(input);

            if (!response.ok) {
                throw new Error(`Error al cargar el archivo: ${response.statusText} (${response.status})`);
            }

            objText = await response.text();
        } else {
            throw new Error("El input proporcionado no es válido.");
        }

        // Validar el contenido del archivo
        if (objText.trim().startsWith("<")) {
            throw new Error("El archivo cargado parece ser HTML en lugar de un archivo OBJ válido.");
        }

        console.log("Contenido del archivo OBJ cargado:", objText);
        const parsedData = parseOBJ(objText);
        console.log("Datos parseados del OBJ:", parsedData);

        return parsedData;
    } catch (err) {
        console.error("Error loading OBJ file:", err);
    }
}




async function configureBuffersAndVaos(gl) {
    try {
        const buildingData = await loadObj('/assets/models/Edificio2.obj');

        if (!buildingData) {
            console.error("No se encontraron datos válidos en el archivo OBJ");
            return;
        }

        buildingsBufferInfo = twgl.createBufferInfoFromArrays(gl, buildingData);
        buildingsVao = twgl.createVAOFromBufferInfo(gl, programInfo, buildingsBufferInfo);

        console.log("Buffers and VAOs configured successfully");
    } catch (err) {
        console.error("Error in configureBuffersAndVaos:", err);
    }
}




function parseOBJ(objText) {
    const positions = [];
    const normals = [];
    const indices = [];
    const lines = objText.split("\n");

    lines.forEach((line, index) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0 || parts[0].startsWith("#")) {
            console.log(`Línea ignorada en ${index + 1}: ${line}`);
            return; // Ignorar líneas vacías o comentarios
        }

        switch (parts[0]) {
            case "v": // Vértices
                positions.push(...parts.slice(1).map(Number));
                break;
            case "vn": // Normales
                normals.push(...parts.slice(1).map(Number));
                break;
            case "f": // Caras
                const faceIndices = parts.slice(1).map((part) => {
                    const [vertexIndex] = part.split("/").map(Number);
                    return vertexIndex - 1; // 1-indexado a 0-indexado
                });
                for (let i = 1; i < faceIndices.length - 1; i++) {
                    indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
                }
                break;
            default:
                console.log(`Línea ignorada en ${index + 1}: ${line}`);
                break;
        }
    });

    console.log("Final Positions:", positions);
    console.log("Final Normals:", normals);
    console.log("Final Indices:", indices);

    if (positions.length === 0 || indices.length === 0) {
        console.error("No se encontraron datos válidos en el archivo OBJ");
        return null;
    }

    return {
        a_position: { numComponents: 3, data: positions },
        a_normal: { numComponents: 3, data: normals.length > 0 ? normals : [] },
        indices: { data: indices },
    };
}












function drawBuildings(gl, viewProjectionMatrix) {
    gl.bindVertexArray(buildingsVao);

    buildings.forEach((building) => {
        // Crear transformaciones
        building.matrix = twgl.m4.identity();
        const position = twgl.v3.create(...building.position);
        const scale = twgl.v3.create(...building.scale);

        building.matrix = twgl.m4.translate(building.matrix, position);
        building.matrix = twgl.m4.scale(building.matrix, scale);

        // Enviar las matrices al shader
        twgl.setUniforms(programInfo, { u_matrix: twgl.m4.multiply(viewProjectionMatrix, building.matrix) });

        // Dibujar el objeto
        twgl.drawBufferInfo(gl, buildingsBufferInfo);
    });




    // Generate the agent and obstacle data
    // carsArrays = generateData(1);
    // buildingsArrays = generateData(1);
    // roadsArrays = generateData(1);
    // trafficLightsArrays = generateData(1);
    // destinationsArrays = generateData(1);

    // Create buffer information from the agent and obstacle data
    // carsBufferInfo = twgl.createBufferInfoFromArrays(gl, carsArrays);
    // buildingsBufferInfo = twgl.createBufferInfoFromArrays(gl, buildingsArrays);
    // roadsBufferInfo = twgl.createBufferInfoFromArrays(gl, roadsArrays);
    // trafficLightsBufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightsArrays);
    // destinationsBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    // carsVao = twgl.createVAOFromBufferInfo(gl, programInfo, carsBufferInfo);
    // buildingsVao = twgl.createVAOFromBufferInfo(gl, programInfo, buildingsBufferInfo);
    // console.assert(buildingsVao, "buildingsVao is not initialized");
    // roadsVao = twgl.createVAOFromBufferInfo(gl, programInfo, roadsBufferInfo);
    // trafficLightsVao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightsBufferInfo);
    // destinationsVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationsBufferInfo);
}

(async function () {
    // Get the WebGL context
    const canvas = document.getElementById("city-canvas");
    let gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("WebGL 2 is not supported. Falling back to WebGL 1.");
        gl = canvas.getContext("webgl");
    }
    if (!gl) {
        console.error("WebGL is not supported on this browser.");
    }

    // Create the program
    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);
    if (!gl.getProgramParameter(programInfo.program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(programInfo.program));
    }

    // Configure the buffers and vertex array objects (VAOs)
    configureBuffersAndVaos(gl);

    // Set controllers for the camera and the scene
    // setupUI(gl);

    // Initialize the agents model
    await initAgentsModel();

    // Get the city objects
    await getCity();
    
    await configureBuffersAndVaos(gl);


    // Draw the scene
    await drawScene(gl);
    let error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error("WebGL error:", error);
    }



})();








// ******************************** drawings ********************************
/*
 * Draws the buildings in the scene.
 */
// function drawBuildings(gl, viewProjectionMatrix) {
//     // Bind the vertex array object for all the city objects
//     gl.bindVertexArray(buildingsVao);

//     // Set the model matrix for the buildings
//     buildings.forEach((building) => {
//         // Create the matrix transformations for the buildings
//         const buildingTrans = twgl.v3.create(...building.position);
//         const buildingScale = twgl.v3.create(...building.scale);

//         // Calculate the building's matrix
//         building.matrix = twgl.m4.translate(viewProjectionMatrix, buildingTrans);
//         building.matrix = twgl.m4.rotateX(building.matrix, building.rotation[0]);
//         building.matrix = twgl.m4.rotateY(building.matrix, building.rotation[1]);
//         building.matrix = twgl.m4.rotateZ(building.matrix, building.rotation[2]);
//         building.matrix = twgl.m4.scale(building.matrix, buildingScale);
        
//         // Set the uniforms for the buildings
//         let uniforms = {
//             u_matrix: building.matrix,
//         };
        
//         // Set the uniforms for the objects and draw them
//         twgl.setUniforms(programInfo, uniforms);
//         twgl.drawBufferInfo(gl, buildingsBufferInfo);
//     });
// }
/*
 * Draws the roads in the scene.
 */
function drawRoads(gl, viewProjectionMatrix) {

}
/*
 * Draws the traffic lights in the scene.
 */
function drawTrafficLights(gl, viewProjectionMatrix) {

}
/*
 * Draws the destinations in the scene.
 */
function drawDestinations(gl, viewProjectionMatrix) {

}








// ******************************** helper functions ********************************
/*
 * Generates the data for the objects in the scene.
 */
function generateData(size){
    let arrays =
    {
        a_position: {
                numComponents: 3,
                data: [
                  // Front Face
                  -0.5, -0.5,  0.5,
                  0.5, -0.5,  0.5,
                  0.5,  0.5,  0.5,
                 -0.5,  0.5,  0.5,

                 // Back face
                 -0.5, -0.5, -0.5,
                 -0.5,  0.5, -0.5,
                  0.5,  0.5, -0.5,
                  0.5, -0.5, -0.5,

                 // Top face
                 -0.5,  0.5, -0.5,
                 -0.5,  0.5,  0.5,
                  0.5,  0.5,  0.5,
                  0.5,  0.5, -0.5,

                 // Bottom face
                 -0.5, -0.5, -0.5,
                  0.5, -0.5, -0.5,
                  0.5, -0.5,  0.5,
                 -0.5, -0.5,  0.5,

                 // Right face
                  0.5, -0.5, -0.5,
                  0.5,  0.5, -0.5,
                  0.5,  0.5,  0.5,
                  0.5, -0.5,  0.5,

                 // Left face
                 -0.5, -0.5, -0.5,
                 -0.5, -0.5,  0.5,
                 -0.5,  0.5,  0.5,
                 -0.5,  0.5, -0.5
                ].map(e => size * e)
            },
        a_color: {
                numComponents: 4,
                data: [
                  // Front face
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                  // Back Face
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                  // Top Face
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                  // Bottom Face
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                  // Right Face
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                  // Left Face
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                ]
            },
        indices: {
                numComponents: 3,
                data: [
                  0, 1, 2,      0, 2, 3,    // Front face
                  4, 5, 6,      4, 6, 7,    // Back face
                  8, 9, 10,     8, 10, 11,  // Top face
                  12, 13, 14,   12, 14, 15, // Bottom face
                  16, 17, 18,   16, 18, 19, // Right face
                  20, 21, 22,   20, 22, 23  // Left face
                ]
            }
    };
    return arrays;
}
