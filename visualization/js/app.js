"use strict";
import * as twgl from 'twgl.js';
import GUI from "lil-gui";
import vsGLSL from "../assets/shaders/vs_phong.glsl?raw";
import fsGLSL from "../assets/shaders/fs_phong.glsl?raw";

//  Definir la paleta de colores en hexadecimal
const colorPalette = [
    "#B2AA8E", 
    "#0C1B33",
    "#4B6858", 
    "#86615C", 
    // "#9B59B6", 
    // "#E67E22", 
    // "#1ABC9C", 
    // "#2ECC71", 
    // "#3498DB", 
    // "#E74C3C"  
];

//  Convertir la paleta de colores a formato RGB normalizado
const normalizedColorPalette = colorPalette.map(hex => hexToRGBA(hex));

/**
 * Convierte un color hexadecimal a un arreglo [r, g, b, a].
 *
 */
function hexToRGBA(hex) {
    // Elimina el carácter '#' si está presente
    hex = hex.replace(/^#/, '');
    
    // Expande los códigos cortos (e.g., "FFF") a completos ("FFFFFF")
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // Extrae los componentes R, G, B
    const bigint = parseInt(hex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    
    return [r, g, b, 1.0]; // Opacidad completa
}

function getRandomColor() {
    return [
        Math.random(), // R (0.0 - 1.0)
        Math.random(), // G (0.0 - 1.0)
        Math.random(), // B (0.0 - 1.0)
        1.0            // A (opacidad completa)
    ];
}


// Define the Object3D class to represent 3D objects
class Object3D {
    constructor(
        id,
        position = [0, 0, 0],
        rotation = [0, 0, 0],
        scale = [0.5, 0.5, 0.5]
    ) {
        this.id = id;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.matrix = twgl.m4.create();
        this.previousPosition = position.slice();
        this.targetPosition = position.slice();
        this.previousRotation = rotation.slice();
        this.targetRotation = rotation.slice();

        // Asignar colores aleatorios
        this.ambientColor = getRandomColor();
        this.diffuseColor = getRandomColor();
        this.specularColor = getRandomColor();
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
    // Camera Position
    cameraPosition: {
        x: 20,
        y: 20,
        z: 20,
    },
    // Light Properties
    lightPosition: {
        x: 10,
        y: 10,
        z: 10,
    },
    ambientColor: [0.2, 0.2, 0.2, 1.0],
    diffuseColor: [0.5, 0.5, 0.5, 1.0],
    specularColor: [1.0, 1.0, 1.0, 1.0],
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
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);
    // Set the target position
    const target = [data.width / 2, 0, data.height / 2];
    // Set the up vector
    const up = [0, 1, 0];
    // Calculate the camera position
    const camPos = [
        settings.cameraPosition.x + data.width / 2,
        settings.cameraPosition.y,
        settings.cameraPosition.z + data.height / 2
    ];
    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);
    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);
    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);
    // Return both matrices y posición de la cámara
    return { viewProjectionMatrix, camPos };
}

/*
 * Updates the cars positions by sending a request to the agent server.
 */
async function updateScene() {
    try {
        // Send a request to the server to update the cars positions
        let response = await fetch(agent_server_uri + "update") 
    
        // Check if the response was successful
        if(response.ok){
            // Retrieve the updated cars positions
            await getCars()
            // Log a message indicating that the cars have been updated
            console.log("Cars Updated")
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error) 
    }
}

/*
 * Draws the scene in the WebGL context.
 */
async function drawScene(gl) {
    // Redimensiona el canvas y establece el viewport
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Limpia la pantalla
    gl.clearColor(0.96, 0.95, 0.96, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Usa el programa
    gl.useProgram(programInfo.program);
    
    // Configura la matriz de vista y proyección
    const { viewProjectionMatrix, camPos } = setupWorldView(gl);
    
    // Define los uniformes globales de iluminación
    const globalUniforms = {
        u_lightPosition: [settings.lightPosition.x, settings.lightPosition.y, settings.lightPosition.z], // Arreglo de 3 elementos
        u_ambientColor: settings.ambientColor,
        u_diffuseColor: settings.diffuseColor,
        u_specularColor: settings.specularColor,
        u_viewPosition: camPos,
    };
    
    // Dibuja los objetos pasando los uniformes globales y específicos
    drawBuildings(gl, viewProjectionMatrix, globalUniforms);
    drawRoads(gl, viewProjectionMatrix, globalUniforms);
    drawTrafficLights(gl, viewProjectionMatrix, globalUniforms);
    //drawDestinations(gl, viewProjectionMatrix, globalUniforms);
    drawCars(gl, viewProjectionMatrix, globalUniforms);
    
    // Incrementa el contador de frames
    frameCount++;
    
    // Actualiza la escena cada 30 frames
    if (frameCount % 30 === 0) {
        frameCount = 0;
        await updateScene();
    }
    
    // Solicita el siguiente frame
    requestAnimationFrame(() => drawScene(gl));
}

/*
 * Updates the camera position for the specified axis.
 */
function updateCamera(e, gl, axis, cameraValue) {
    // Update the camera position value for the specified axis
    cameraValue.textContent = e.target.value;

    // Update the camera position for the specified axis
    settings.cameraPosition[axis] = parseFloat(e.target.value);

    // Redraw the scene
    drawScene(gl);
}

/*
 * Sets up the user interface (UI) for the scene (controllers).
 */
function setupUI(gl) {
    // Get the range inputs for the camera controls
    const cameraX = document.getElementById("cameraX");
    const cameraY = document.getElementById("cameraY");
    const cameraZ = document.getElementById("cameraZ");

    // Get the button for resetting the camera position
    const resetCamera = document.getElementById("resetCamera");

    // Set the initial values for the camera controls
    cameraX.value = settings.cameraPosition.x;
    cameraY.value = settings.cameraPosition.y;
    cameraZ.value = settings.cameraPosition.z;

    // Get the paragraph elements for the camera values
    const cameraXValue = document.getElementById("cameraXValue");
    const cameraYValue = document.getElementById("cameraYValue");
    const cameraZValue = document.getElementById("cameraZValue");

    // Set the initial values for the camera value paragraphs
    cameraXValue.textContent = settings.cameraPosition.x;
    cameraYValue.textContent = settings.cameraPosition.y;
    cameraZValue.textContent = settings.cameraPosition.z;

    // Add event listeners for the camera controls
    cameraX.addEventListener("input", (e) => updateCamera(e, gl, "x", cameraXValue));
    cameraY.addEventListener("input", (e) => updateCamera(e, gl, "y", cameraYValue));
    cameraZ.addEventListener("input", (e) => updateCamera(e, gl, "z", cameraZValue));

    // Add event listener for the reset camera button
    resetCamera.addEventListener("click", () => {
        // Reset the camera position values
        cameraX.value = settings.cameraPosition.x = 20;
        cameraY.value = settings.cameraPosition.y = 20;
        cameraZ.value = settings.cameraPosition.z = 20;

        // Update the camera value paragraphs
        cameraXValue.textContent = settings.cameraPosition.x;
        cameraYValue.textContent = settings.cameraPosition.y;
        cameraZValue.textContent = settings.cameraPosition.z;

        // Redraw the scene
        drawScene(gl);
    });

    // Crear la interfaz GUI para iluminación
    const gui = new GUI();
    const lightFolder = gui.addFolder('Iluminación');

    // Control para la posición de la luz
    lightFolder.add(settings.lightPosition, 'x', -50, 50).name('Posición X').onChange(() => {});
    lightFolder.add(settings.lightPosition, 'y', -50, 50).name('Posición Y').onChange(() => {});
    lightFolder.add(settings.lightPosition, 'z', -50, 50).name('Posición Z').onChange(() => {});

    // Control para el color ambiental
    lightFolder.addColor(settings, 'ambientColor').name('Color Ambiental');

    // Control para el color difuso
    lightFolder.addColor(settings, 'diffuseColor').name('Color Difuso');

    // Control para el color especular
    lightFolder.addColor(settings, 'specularColor').name('Color Especular');

    lightFolder.open();
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
        // Send a GET request to the agent server to retrieve the city objects positions
        let response = await fetch(agent_server_uri + "get-city");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();

            // Create new objects and add them to the object arrays
            result.buildings.forEach((building) => {
                const newBuilding = new Object3D(building.id, [building.x, building.y, building.z])
                buildings.push(newBuilding)
            });
            result.roads.forEach((road) => {
                const newRoad = new Object3D(road.id, [road.x, road.y - 1.4, road.z])
                roads.push(newRoad)
            });
            result.trafficLights.forEach((trafficLight) => {
                const newTrafficLight = new Object3D(
                    trafficLight.id,
                    [trafficLight.x, trafficLight.y, trafficLight.z]
                );

                // Asignar dirección
                newTrafficLight.direction = trafficLight.direction; // Asegúrate de que el servidor envíe esta propiedad

                // Evaluar la condición: si dos caracteres de dos celdas son iguales
                // Aquí, asumo que tienes propiedades `cell1` y `cell2` con caracteres
                // Ajusta esto según tu estructura de datos real
                if (trafficLight.cell1 === trafficLight.cell2) {
                    newTrafficLight.sameDirection = true;
                }

                // Establecer rotación basada en la dirección y la condición
                setTrafficLightRotation(newTrafficLight);

                trafficLights.push(newTrafficLight);
            });
            result.destinations.forEach((destination) => {
                const newDestination = new Object3D(destination.id, [destination.x, destination.y, destination.z])
                destinations.push(newDestination)
            });
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

function setTrafficLightRotation(trafficLight) {
    if (trafficLight.sameDirection) {
        // Rotar hacia una dirección específica cuando la condición se cumple
        // Por ejemplo, rotar 90 grados
        trafficLight.rotation = [0, degreesToRadians(90), 0];
    } else {
        // Rotar basado en la dirección de la calle
        switch (trafficLight.direction) {
            case 'Up':
                trafficLight.rotation = [0, degreesToRadians(0), 0];
                break;
            case 'Down':
                trafficLight.rotation = [0, degreesToRadians(180), 0];
                break;
            case 'Left':
                trafficLight.rotation = [0, degreesToRadians(90), 0];
                break;
            case 'Right':
                trafficLight.rotation = [0, degreesToRadians(270), 0];
                break;
            default:
                trafficLight.rotation = [0, 0, 0];
        }
    }
}

/*
 * Retrieves the current positions of all cars from the server.
 */
async function getCars() {
    try {
        // Send a GET request to the agent server to retrieve the cars positions
        let response = await fetch(agent_server_uri + "get-cars");

        // Check if the response was successful
        if (response.ok) {
            // Parse the response as JSON
            let result = await response.json();
            console.log(result);

            const car_rot = {
                "Up": 180,
                "Down": 0,
                "Left": 90,
                "Right": 270,
            }

            cars = [];
            trafficLights = [];

            // Check if the cars array is empty
            if(cars.length === 0){
                // Create new objects and add them to the object arrays
                result.cars.forEach((car) => {
                    const angleInRadians = Math.PI * car_rot[car.dir] / 180;
                    const newCar = new Object3D(car.id, [car.x, car.y, car.z], [0, angleInRadians, 0], [0.8, 0.8, 0.8]);
                    newCar["dir"] = car.dir
                    cars.push(newCar);
                });

                result.trafficLights.forEach((trafficLight) => {
                    const newTrafficLight = new Object3D(trafficLight.id, [trafficLight.x, trafficLight.y, trafficLight.z])
                    trafficLights.push(newTrafficLight)
                });
                // Log the cars array
                // console.log("Cars: ", agents)
            } else {
                // Update the positions of existing cars
                result.cars.forEach((car) => {
                    const angleInRadians = Math.PI * car_rot[car.dir] / 180;
                    const current_car = cars.find((object3d) => object3d.id === car.id);
                    // Check if the car exists in the cars array
                    if(current_car !== undefined){
                        // Update the agent's position
                        current_car.position = [car.x, car.y, car.z];
                        current_car.rotation = [0, angleInRadians, 0]
                    }
                });
            }
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

/*
 * Configures the buffers and vertex array objects (VAOs) for the scene.
 */
async function configureBuffersAndVaosForCars(gl) {
    // Generate the agent and obstacle data
    carsArrays = await loadObj("./coche.obj");

    // Create buffer information from the agent and obstacle data
    carsBufferInfo = twgl.createBufferInfoFromArrays(gl, carsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    carsVao = twgl.createVAOFromBufferInfo(gl, programInfo, carsBufferInfo);
}


async function configureBuffersAndVaosForBuildings(gl) {
    const roadData = generateData(1.0, 'roads');
    console.log('Datos escalados de carreteras:', roadData.a_position.data);
    // Generate the agent and obstacle data
    buildingsArrays = await loadObj("./Edificio1.obj");

    // Create buffer information from the agent and obstacle data
    buildingsBufferInfo = twgl.createBufferInfoFromArrays(gl, buildingsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    buildingsVao = twgl.createVAOFromBufferInfo(gl, programInfo, buildingsBufferInfo);
}

async function configureBuffersAndVaosForRoads(gl) {
    await loadObj("./floor.obj") // Este es solo un ejemplo de como se llama a la función

    // Generate the agent and obstacle data
    roadsArrays = generateData(1, 'roads');

    // Create buffer information from the agent and obstacle data
    roadsBufferInfo = twgl.createBufferInfoFromArrays(gl, roadsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    roadsVao = twgl.createVAOFromBufferInfo(gl, programInfo, roadsBufferInfo);
}
async function configureBuffersAndVaosForTrafficLights(gl) {
    trafficLightsArrays = await loadObj("./semaforo.obj") // Este es solo un ejemplo de como se llama a la función

    // Verificar si los datos se cargaron correctamente
    if (!trafficLightsArrays) {
        console.error("Error al cargar el modelo de semáforo.");
        return;
    }


    // Generate the agent and obstacle data
    //trafficLightsArrays = generateData(1, 'trafficLights');

    // Create buffer information from the agent and obstacle data
    trafficLightsBufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    trafficLightsVao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightsBufferInfo);
}
async function configureBuffersAndVaosForDestinations(gl) {
    await loadObj("./Edificio2.obj") // Este es solo un ejemplo de como se llama a la función

    // Generate the agent and obstacle data
    destinationsArrays = generateData(1, 'destinations');

    // Create buffer information from the agent and obstacle data
    destinationsBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationsArrays);

    // Create vertex array objects (VAOs) from the buffer information
    destinationsVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationsBufferInfo);
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
    await configureBuffersAndVaosForBuildings(gl);
    await configureBuffersAndVaosForRoads(gl);
    await configureBuffersAndVaosForTrafficLights(gl);
    //await configureBuffersAndVaosForDestinations(gl);
    await configureBuffersAndVaosForCars(gl);

    // Set controllers for the camera and the scene
    setupUI(gl);

    // Initialize the agents model
    await initAgentsModel();

    // Get the city objects
    await getCity();

    // Set the initial cars positions
    await getCars();

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
function drawBuildings(gl, viewProjectionMatrix, globalUniforms) {
    // Vincula el VAO para los edificios
    gl.bindVertexArray(buildingsVao);

    // Itera sobre cada edificio
    buildings.forEach((building) => {
        // Crea las transformaciones
        const buildingTrans = twgl.v3.create(...building.position);
        const buildingScale = twgl.v3.create(...building.scale);

        // Calcula la matriz de modelo
        building.matrix = twgl.m4.translate(viewProjectionMatrix, buildingTrans);
        building.matrix = twgl.m4.rotateX(building.matrix, building.rotation[0]);
        building.matrix = twgl.m4.rotateY(building.matrix, building.rotation[1]);
        building.matrix = twgl.m4.rotateZ(building.matrix, building.rotation[2]);
        building.matrix = twgl.m4.scale(building.matrix, buildingScale);

        // Define los uniformes específicos del modelo
        let modelUniforms = {
            u_matrix: building.matrix,
            u_ambientColor: building.ambientColor,
            u_diffuseColor: building.diffuseColor,
            u_specularColor: building.specularColor,
        };

        // Combina los uniformes globales y específicos
        let allUniforms = Object.assign({}, globalUniforms, modelUniforms);

        // Establece los uniformes y dibuja
        twgl.setUniforms(programInfo, allUniforms);
        twgl.drawBufferInfo(gl, buildingsBufferInfo);
    });
}



/*
 * Draws the roads in the scene.
 */
function drawRoads(gl, viewProjectionMatrix, globalUniforms) {
    // Similar a drawBuildings, incluyendo los uniformes de iluminación
    gl.bindVertexArray(roadsVao);

    roads.forEach((road) => {
        const roadTrans = twgl.v3.create(...road.position);
        const roadScale = twgl.v3.create(...road.scale);

        road.matrix = twgl.m4.translate(viewProjectionMatrix, roadTrans);
        road.matrix = twgl.m4.rotateX(road.matrix, road.rotation[0]);
        road.matrix = twgl.m4.rotateY(road.matrix, road.rotation[1]);
        road.matrix = twgl.m4.rotateZ(road.matrix, road.rotation[2]);
        road.matrix = twgl.m4.scale(road.matrix, roadScale);

        let modelUniforms = {
            u_matrix: road.matrix,
        };

        let allUniforms = Object.assign({}, globalUniforms, modelUniforms);

        twgl.setUniforms(programInfo, allUniforms);
        twgl.drawBufferInfo(gl, roadsBufferInfo);
    });
}

/*
 * Draws the traffic lights in the scene.
 */
function drawTrafficLights(gl, viewProjectionMatrix, globalUniforms) {
    gl.bindVertexArray(trafficLightsVao);

    trafficLights.forEach((trafficLight) => {
        const trafficLightTrans = twgl.v3.create(...trafficLight.position);
        const trafficLightScale = twgl.v3.create(...trafficLight.scale);

        trafficLight.matrix = twgl.m4.translate(viewProjectionMatrix, trafficLightTrans);
        trafficLight.matrix = twgl.m4.rotateX(trafficLight.matrix, trafficLight.rotation[0]);
        trafficLight.matrix = twgl.m4.rotateY(trafficLight.matrix, trafficLight.rotation[1]);
        trafficLight.matrix = twgl.m4.rotateZ(trafficLight.matrix, trafficLight.rotation[2]);
        trafficLight.matrix = twgl.m4.scale(trafficLight.matrix, trafficLightScale);

        let modelUniforms = {
            u_matrix: trafficLight.matrix,
        };

        let allUniforms = Object.assign({}, globalUniforms, modelUniforms);

        twgl.setUniforms(programInfo, allUniforms);
        twgl.drawBufferInfo(gl, trafficLightsBufferInfo);
    });
}

/*
 * Draws the destinations in the scene.
 */
function drawDestinations(gl, viewProjectionMatrix, globalUniforms) {
    gl.bindVertexArray(destinationsVao);

    destinations.forEach((destination) => {
        const destinationTrans = twgl.v3.create(...destination.position);
        const destinationScale = twgl.v3.create(...destination.scale);

        destination.matrix = twgl.m4.translate(viewProjectionMatrix, destinationTrans);
        destination.matrix = twgl.m4.rotateX(destination.matrix, destination.rotation[0]);
        destination.matrix = twgl.m4.rotateY(destination.matrix, destination.rotation[1]);
        destination.matrix = twgl.m4.rotateZ(destination.matrix, destination.rotation[2]);
        destination.matrix = twgl.m4.scale(destination.matrix, destinationScale);

        let modelUniforms = {
            u_matrix: destination.matrix,
        };

        let allUniforms = Object.assign({}, globalUniforms, modelUniforms);

        twgl.setUniforms(programInfo, allUniforms);
        twgl.drawBufferInfo(gl, destinationsBufferInfo);
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error(`Error de WebGL al dibujar destino ID ${destination.id}:`, error);
        }
    });
}

/*
 * Draws the cars in the scene.
 */
function drawCars(gl, viewProjectionMatrix, globalUniforms) {
    // Vincula el VAO para los coches
    gl.bindVertexArray(carsVao);

    // Itera sobre cada coche
    cars.forEach((car) => {
        // Crea las transformaciones
        const carTrans = twgl.v3.create(...car.position);
        const carScale = twgl.v3.create(...car.scale);

        // Calcula la matriz de modelo
        car.matrix = twgl.m4.translate(viewProjectionMatrix, carTrans);
        car.matrix = twgl.m4.rotateX(car.matrix, car.rotation[0]);
        car.matrix = twgl.m4.rotateY(car.matrix, car.rotation[1]);
        car.matrix = twgl.m4.rotateZ(car.matrix, car.rotation[2]);
        car.matrix = twgl.m4.scale(car.matrix, carScale);

        // Define los uniformes específicos del modelo
        let modelUniforms = {
            u_matrix: car.matrix,
            u_ambientColor: car.ambientColor,
            u_diffuseColor: car.diffuseColor,
            u_specularColor: car.specularColor,
        };

        // Combina los uniformes globales y específicos
        let allUniforms = Object.assign({}, globalUniforms, modelUniforms);

        // Establece los uniformes y dibuja
        twgl.setUniforms(programInfo, allUniforms);
        twgl.drawBufferInfo(gl, carsBufferInfo);
    });
}


// ******************************** helper functions ********************************
/*
 * Generates the data for the objects in the scene.
 */
async function loadObj(input) {
    try {
        let objText;

        if (typeof input === "string" && input.trim().startsWith("v ")) {
            // Si el input es un contenido OBJ directamente
            objText = input;
        } else if (typeof input === "string") {
            // Si el input es un URL, intenta cargarlo
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
        const parsedData = parseOBJ(objText);

        return parsedData;
    } catch (err) {
        console.error("Error loading OBJ file:", err);
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
                break;
        }
    });

    if (positions.length === 0 || indices.length === 0) {
        console.error("No se encontraron datos válidos en el archivo OBJ");
        return null;
    }

     // Centrar el modelo al origen
     const vertexCount = positions.length / 3;
     const center = [0, 0, 0];
     for (let i = 0; i < positions.length; i += 3) {
         center[0] += positions[i];
         center[1] += positions[i + 1];
         center[2] += positions[i + 2];
     }
     center[0] /= vertexCount;
     center[1] /= vertexCount;
     center[2] /= vertexCount;
 
     for (let i = 0; i < positions.length; i += 3) {
         positions[i] -= center[0];
         positions[i + 1] -= center[1];
         positions[i + 2] -= center[2];
     }

    return {
        a_position: { numComponents: 3, data: positions },
        a_normal: { numComponents: 3, data: normals.length > 0 ? normals : [] },
        indices: { data: indices },
    };
}
function generateData(size, type, color = [1.0, 1.0, 1.0, 1.0]) {
    const scale = type === 'roads'
    ? [2.0, 0.1, 4.0] // Escala para las carreteras
    : [1.0, 1.0, 1.0]; // Escala genérica para otros objetos
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
                ].map((e, index) => {
                    // Escala cada coordenada según su posición en X, Y o Z
                    return e * size * scale[index % 3];
                })
            },
            
        a_normal: {
                numComponents: 3,
                data: type === 'buildings' ? [
                  // Front face normals
                  0, 0, 1,
                  0, 0, 1,
                  0, 0, 1,
                  0, 0, 1,
                  // Back face normals
                  0, 0, -1,
                  0, 0, -1,
                  0, 0, -1,
                  0, 0, -1,
                  // Top face normals
                  0, 1, 0,
                  0, 1, 0,
                  0, 1, 0,
                  0, 1, 0,
                  // Bottom face normals
                  0, -1, 0,
                  0, -1, 0,
                  0, -1, 0,
                  0, -1, 0,
                  // Right face normals
                  1, 0, 0,
                  1, 0, 0,
                  1, 0, 0,
                  1, 0, 0,
                  // Left face normals
                  -1, 0, 0,
                  -1, 0, 0,
                  -1, 0, 0,
                  -1, 0, 0,
                  
                ] : type === 'roads' ? [
                    // Todas las normales para roads
                    0, 1, 0, // Reemplaza con las normales apropiadas
                    // Repite según sea necesario
                ] : type === 'trafficLights' ? [
                    // Normales para trafficLights
                    0, 1, 0, // Reemplaza con las normales apropiadas
                    // Repite según sea necesario
                ] : type === 'destinations' ? [
                    // Normales para destinations
                    0, 1, 0, // Reemplaza con las normales apropiadas
                    // Repite según sea necesario
                ] : type === 'cars' ? [
                    // Normales para cars
                    0, 1, 0, // Reemplaza con las normales apropiadas
                    // Repite según sea necesario
                ] : [
                    // Normales por defecto
                    0, 0, 0,
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
                ], 
            }
            
    };
    return arrays;
}
