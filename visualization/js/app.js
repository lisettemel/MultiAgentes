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
        scale = [2, 2, 2]
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
        x: 0,
        y: 100,
        z: 0,
    },
    ambientColor: [1.0, 1.0, 1.0, 1.0], 
    diffuseColor: [0.5, 0.5, 0.5, 1.0], 
    specularColor: [1.0, 1.0, 1.0, 1.0],
    lightIntensity: 1.0,
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
async function drawScene(gl, buildingModels) {

    if (!buildingModels || Object.keys(buildingModels).length === 0) {
        console.error("Error: buildingModels no está definido o no se cargaron correctamente.");
        return;
    }
    

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
    const hasTexture = Object.values(buildingModels).some(model =>
        model.bufferInfo.attribs.a_texcoord &&
        model.bufferInfo.attribs.a_texcoord.data &&
        model.bufferInfo.attribs.a_texcoord.data.length > 0
    );

    gl.uniform1i(gl.getUniformLocation(programInfo.program, "u_hasTexture"), hasTexture ? 1 : 0);
    gl.uniform4fv(gl.getUniformLocation(programInfo.program, "u_color"), [1.0, 1.0, 1.0, 1.0]); // Blanco
    gl.uniform1f(gl.getUniformLocation(programInfo.program, "u_lightIntensity"), settings.lightIntensity);

    

    // Set up the view-projection matrix
    const viewProjectionMatrix = setupWorldView(gl);

    // Draw all objects in the scene
    drawBuildings(gl, viewProjectionMatrix, buildingModels);
    drawRoads(gl, viewProjectionMatrix);
    drawTrafficLights(gl, viewProjectionMatrix);
    drawDestinations(gl, viewProjectionMatrix);
    drawCars(gl, viewProjectionMatrix);

    // Increment the frame count
    frameCount++;

    // Update the scene every 30 frames
    if(frameCount%30 == 0){
        frameCount = 0
        await updateScene();
    } 
    

    
    // Request the next frame
    requestAnimationFrame(() => drawScene(gl, buildingModels));
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
    drawScene(gl, buildingModels);
}

/*
 * Sets up the user interface (UI) for the scene (controllers).
 */
function setupUI(gl) {
    // Get the range inputs for the camera controls
    const cameraX = document.getElementById("cameraX");
    const cameraY = document.getElementById("cameraY");
    const cameraZ = document.getElementById("cameraZ");

    // Get the bottom for reseting the camera position
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
        drawScene(gl, buildingModels);
    });
    // Añade el control de intensidad de luz
    const gui = new GUI();
    gui.addColor(settings, 'ambientColor').onChange(() => {
        drawScene(gl, buildingModels); // Redibuja con los nuevos valores
    });
    gui.add(settings, 'lightIntensity', 0.0, 50.0).onChange(() => {
        drawScene(gl, buildingModels); // Redibuja con la nueva intensidad
    });

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

            // Definir los tres tipos de edificios y sus IDs fijos
            const types = ['building1', 'building2', 'building3'];
            const ids = [1, 2, 3]; // IDs únicos para los tres tipos de edificios

            // Crear los edificios reutilizando los IDs y asignándoles un tipo
            result.buildings.forEach((building, index) => {
                // Seleccionar un tipo de edificio basado en el índice
                const typeIndex = index % types.length; // Ciclar entre 0, 1, 2
                const newBuilding = new Object3D(
                    ids[typeIndex], // Asignar el ID correspondiente al tipo
                    [building.x, building.y + 2.5, building.z] // Posición
                );
                newBuilding.type = types[typeIndex]; // Asignar el tipo correspondiente
                newBuilding.material = building.material; // Asignar el material si aplica

                // Agregar el edificio a la lista de edificios
                buildings.push(newBuilding);
            });
            
            result.roads.forEach((road) => {
                const newRoad = new Object3D(road.id, [road.x, road.y, road.z]);
                roads.push(newRoad);
            });
            result.trafficLights.forEach((trafficLight) => {
                const newTrafficLight = new Object3D(trafficLight.id, [trafficLight.x, trafficLight.y, trafficLight.z]);
                trafficLights.push(newTrafficLight);
            });
            result.destinations.forEach((destination) => {
                const newDestination = new Object3D(destination.id, [destination.x, destination.y, destination.z]);
                destinations.push(newDestination);
            });
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
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

            // Check if the cars array is empty
            if(cars.length == 0){
                // Create new objects and add them to the object arrays
                result.cars.forEach((car) => {
                    const newCar = new Object3D(car.id, [car.x, car.y, car.z]);
                    cars.push(newCar);
                });
                // Log the cars array
                // console.log("Cars: ", agents)
            } else {
                // Update the positions of existing cars
                result.cars.forEach((car) => {
                    const current_car = cars.find((object3d) => object3d.id == car.id);
                    // Check if the car exists in the cars array
                    if(current_car != undefined){
                        // Update the agent's position
                        current_car.position = [car.x, car.y, car.z];
                    }
                });
            }
        }
    } catch (error) {
        // Log any errors that occur during the request
        console.log(error);
    }
}

async function loadMTL(mtlFilePath) {
    try {
        console.log(`Cargando archivo MTL desde: ${mtlFilePath}`);
        const response = await fetch(mtlFilePath);

        if (!response.ok) {
            throw new Error(`Error al cargar el archivo MTL: ${response.statusText}`);
        }

        const mtlText = await response.text();
        const materials = parseMTL(mtlText); // Asegúrate de llamar a parseMTL y asignar el resultado a 'materials'

        console.log("Materiales cargados:", materials);
        return materials; // Devuelve los materiales procesados
    } catch (error) {
        console.error("Error cargando archivo MTL:", error);
        throw error; // Vuelve a lanzar el error para detener el flujo
    }
}


function parseMTL(mtlText) {
    const materials = {};
    let currentMaterial = null;

    mtlText.split("\n").forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0 || parts[0].startsWith("#")) return;

        const keyword = parts[0].toLowerCase();
        switch (keyword) {
            case "newmtl":
                currentMaterial = parts[1];
                materials[currentMaterial] = {};
                break;
            case "ka": // Ambient component
                if (currentMaterial) {
                    materials[currentMaterial].ambient = parts.slice(1).map(Number);
                }
                break;
            case "kd": // Diffuse component
                if (currentMaterial) {
                    materials[currentMaterial].diffuse = parts.slice(1).map(Number);
                }
                break;
            case "ks": // Specular component
                if (currentMaterial) {
                    materials[currentMaterial].specular = parts.slice(1).map(Number);
                }
                break;
            case "ns": // Shininess
                if (currentMaterial) {
                    materials[currentMaterial].shininess = parseFloat(parts[1]);
                }
                break;
        }
    });

    return materials;
}

async function combineObjWithMtl(objPath, mtlPath) {
    try {
        // Cargar los datos del archivo OBJ
        const objData = await loadObj(objPath);

        if (!objData) {
            throw new Error(`No se pudo cargar el archivo OBJ en la ruta: ${objPath}`);
        }

        // Cargar los datos del archivo MTL
        const mtlData = await loadMTL(mtlPath);

        if (!mtlData) {
            throw new Error(`No se pudo cargar el archivo MTL en la ruta: ${mtlPath}`);
        }

        // Combinar geometría y materiales en un modelo
        const model = {
            geometry: objData,
            materials: mtlData,
        };

        console.log(`Modelo combinado cargado de: OBJ (${objPath}) y MTL (${mtlPath})`);
        return model;
    } catch (error) {
        console.error(`Error al combinar OBJ y MTL: ${error}`);
        throw error;
    }
}




// ******************************** drawings ********************************

/*
 * Configures the buffers and vertex array objects (VAOs) for the scene.
 */
let buildingModels = null; 

async function configureBuffersAndVaos(gl) {
    try {
        // Cargar los modelos OBJ
        console.log("Cargando modelos...");
        const building1Model = await combineObjWithMtl("./Edificio1.obj", "./Edificio1.mtl");
        const building2Model = await combineObjWithMtl("./Edificio2.obj", "./Edificio2.mtl");
        const building3Model = await combineObjWithMtl("./Edificio3.obj", "./Edificio3.mtl");

    

        console.log("Modelos cargados correctamente:", { building1Model, building2Model, building3Model});

    

        // Crear buffers para las carreteras
        const roadArrays = generateData(1, 'roads'); // Generar datos para las carreteras
        roadsBufferInfo = twgl.createBufferInfoFromArrays(gl, roadArrays);
        roadsVao = twgl.createVAOFromBufferInfo(gl, programInfo, roadsBufferInfo);

        // Configurar datos para los carros
        const carsArrays = generateData(0.5, "cars"); // Generar datos para los carros
        carsBufferInfo = twgl.createBufferInfoFromArrays(gl, carsArrays);
        carsVao = twgl.createVAOFromBufferInfo(gl, programInfo, carsBufferInfo);

         // Configurar datos para destinaciones
         const destinationsArrays = generateData(1, "destinations"); // Generar datos para destinaciones
         destinationsBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationsArrays);
         destinationsVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationsBufferInfo);

        // Configurar datos para luces de tráfico
        const trafficLightArrays = generateData(1, 'trafficLights'); // Generar datos
        trafficLightsBufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightArrays);
        trafficLightsVao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightsBufferInfo);

        // Crear buffers y VAOs para los modelos
        const buildingModels = {
            bbuilding1: {
                bufferInfo: twgl.createBufferInfoFromArrays(gl, building1Model.geometry),
                vao: twgl.createVAOFromBufferInfo(gl, programInfo, twgl.createBufferInfoFromArrays(gl, building1Model.geometry)),
                materials: building1Model.materials,
            },
            building2: {
                bufferInfo: twgl.createBufferInfoFromArrays(gl, building2Model.geometry),
                vao: twgl.createVAOFromBufferInfo(gl, programInfo, twgl.createBufferInfoFromArrays(gl, building2Model.geometry)),
                materials: building2Model.materials,
            },
            building3: {
                bufferInfo: twgl.createBufferInfoFromArrays(gl, building3Model.geometry),
                vao: twgl.createVAOFromBufferInfo(gl, programInfo, twgl.createBufferInfoFromArrays(gl, building3Model.geometry)),
                materials: building3Model.materials,
            },
        };

        console.log("Modelos de edificios configurados correctamente:", buildingModels);

        // Retornar los modelos configurados para su uso posterior
        return buildingModels;

    } catch (error) {
        console.error("Error al configurar buffers y VAOs:", error);
        throw error;
    }
}



(async function () {
    // Get the WebGL context
    const canvas = document.getElementById("city-canvas");
    let gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
        console.error("WebGL 2 is not supported. Falling back to WebGL 1.");
        gl = canvas.getContext("webgl");
    }
    if (!gl) {
        console.error("WebGL is not supported on this browser.");
        return;
    }

    // Create the program
    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);
    if (!gl.getProgramParameter(programInfo.program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(programInfo.program));
        return;
    }

    try{
        // Configure the buffers and vertex array objects (VAOs)
        buildingModels = await configureBuffersAndVaos(gl);
        if (!buildingModels || Object.keys(buildingModels).length === 0) {
            throw new Error("Error: buildingModels no está definido o no se cargaron correctamente.");
        }

        // Set controllers for the camera and the scene
        setupUI(gl);

        // Initialize the agents model
        await initAgentsModel();

        // Get the city objects
        await getCity();

        // Set the initial cars positions
        await getCars();

        // Draw the scene
        await drawScene(gl, buildingModels);
    } catch (error) {
        console.error("Error al cargar los buffers y VAOs:", error);
    }
})();








// ******************************** drawings ********************************
/*
 * Draws the buildings in the scene.
 */
function drawBuildings(gl, viewProjectionMatrix, buildingModels) {
    Object.keys(buildingModels).forEach((key) => {
        const model = buildingModels[key];
        if (!model.vao || !model.bufferInfo) {
            console.error(`Error: VAO o bufferInfo no definido para ${key}.`);
            return;
        }

        gl.bindVertexArray(model.vao);

        buildings.forEach((building) => {
            if (building.type === key) {
                const buildingTrans = twgl.v3.create(...building.position);
                const buildingScale = twgl.v3.create(...building.scale);

                building.matrix = twgl.m4.translate(viewProjectionMatrix, buildingTrans);
                building.matrix = twgl.m4.rotateX(building.matrix, building.rotation[0]);
                building.matrix = twgl.m4.rotateY(building.matrix, building.rotation[1]);
                building.matrix = twgl.m4.rotateZ(building.matrix, building.rotation[2]);
                building.matrix = twgl.m4.scale(building.matrix, buildingScale);

                // Obtener el material correspondiente
                const material = model.materials[building.material] || {
                    ambient: [1.0, 1.0, 1.0, 1.0],
                    diffuse: [0.8, 0.8, 0.8, 1.0],
                    specular: [1.0, 1.0, 1.0, 1.0],
                    shininess: 50.0,
                };

                //console.log(`Material para el edificio ${building.id}:`, material);

                // Verificar que las propiedades del material tengan 4 componentes
                const ambient = material.ambient.length === 4 ? material.ambient : [1.0, 1.0, 1.0, 1.0];
                const diffuse = material.diffuse.length === 4 ? material.diffuse : [0.8, 0.8, 0.8, 1.0];
                const specular = material.specular.length === 4 ? material.specular : [1.0, 1.0, 1.0, 1.0];

                // Revisa que las propiedades de los materiales sean válidas
                if (!material.ambient || !material.diffuse || !material.specular) {
                    console.error(`Material incompleto para el edificio ${building.id}:`, material);
                }

                const normalMatrix = twgl.m4.transpose(twgl.m4.inverse(building.matrix));

                const uniforms = {
                    u_matrix: building.matrix,
                    u_normalMatrix: normalMatrix,
                    u_lightDirection: twgl.v3.normalize([
                        settings.lightPosition.x,
                        settings.lightPosition.y,
                        settings.lightPosition.z,
                    ]),
                    u_ambientColor: ambient,
                    u_diffuseColor: diffuse,
                    u_specularColor: specular,
                    u_shininess: material.shininess,
                    a_color: material.diffuseColor
                };
            

                twgl.setUniforms(programInfo, uniforms);
                twgl.drawBufferInfo(gl, model.bufferInfo);
            }
        });
    });
}




/*
 * Draws the roads in the scene.
 */
function drawRoads(gl, viewProjectionMatrix) {
    // Bind the vertex array object for the roads
    gl.bindVertexArray(roadsVao);

    // Set the model matrix for the roads
    roads.forEach((road) => {
        // Create the matrix transformations for the roads
        const roadTrans = twgl.v3.create(...road.position);
        const roadScale = twgl.v3.create(...road.scale);

        // Calculate the road's matrix
        road.matrix = twgl.m4.translate(viewProjectionMatrix, roadTrans);
        road.matrix = twgl.m4.rotateX(road.matrix, road.rotation[0]);
        road.matrix = twgl.m4.rotateY(road.matrix, road.rotation[1]);
        road.matrix = twgl.m4.rotateZ(road.matrix, road.rotation[2]);
        road.matrix = twgl.m4.scale(road.matrix, roadScale);

        // Set the uniforms for the roads
        let uniforms = {
            u_matrix: road.matrix,
        };

        // Set the uniforms for the roads and draw them
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, roadsBufferInfo);
    });
}
/*
 * Draws the traffic lights in the scene.
 */
function drawTrafficLights(gl, viewProjectionMatrix) {
    // Bind the vertex array object for the traffic lights
    gl.bindVertexArray(trafficLightsVao);

    // Set the model matrix for the traffic lights
    trafficLights.forEach((trafficLight) => {
        // Create the matrix transformations for the traffic lights
        const trafficLightTrans = twgl.v3.create(...trafficLight.position);
        const trafficLightScale = twgl.v3.create(...trafficLight.scale);

        // Calculate the traffic light's matrix
        trafficLight.matrix = twgl.m4.translate(viewProjectionMatrix, trafficLightTrans);
        trafficLight.matrix = twgl.m4.rotateX(trafficLight.matrix, trafficLight.rotation[0]);
        trafficLight.matrix = twgl.m4.rotateY(trafficLight.matrix, trafficLight.rotation[1]);
        trafficLight.matrix = twgl.m4.rotateZ(trafficLight.matrix, trafficLight.rotation[2]);
        trafficLight.matrix = twgl.m4.scale(trafficLight.matrix, trafficLightScale);

        // Set the uniforms for the traffic lights
        let uniforms = {
            u_matrix: trafficLight.matrix,
        };

        // Set the uniforms for the traffic lights and draw them
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, trafficLightsBufferInfo);
    });
}
/*
 * Draws the destinations in the scene.
 */
function drawDestinations(gl, viewProjectionMatrix) {
    // Bind the vertex array object for the destinations
    gl.bindVertexArray(destinationsVao);

    // Set the model matrix for the destinations
    destinations.forEach((destination) => {
        // Create the matrix transformations for the destinations
        const destinationTrans = twgl.v3.create(...destination.position);
        const destinationScale = twgl.v3.create(...destination.scale);

        // Calculate the destination's matrix
        destination.matrix = twgl.m4.translate(viewProjectionMatrix, destinationTrans);
        destination.matrix = twgl.m4.rotateX(destination.matrix, destination.rotation[0]);
        destination.matrix = twgl.m4.rotateY(destination.matrix, destination.rotation[1]);
        destination.matrix = twgl.m4.rotateZ(destination.matrix, destination.rotation[2]);
        destination.matrix = twgl.m4.scale(destination.matrix, destinationScale);

        // Set the uniforms for the destinations
        let uniforms = {
            u_matrix: destination.matrix,
        };

        // Set the uniforms for the destinations and draw them
        twgl.setUniforms(programInfo, uniforms);
        twgl.drawBufferInfo(gl, destinationsBufferInfo);
    });
}
/*
 * Draws the cars in the scene.
 */
function drawCars(gl, viewProjectionMatrix) {
    // Bind the vertex array object for the cars
    gl.bindVertexArray(carsVao);

    // Set the model matrix for the cars
    cars.forEach((car) => {
        // Create the matrix transformations for the cars
        const carTrans = twgl.v3.create(...car.position);
        const carScale = twgl.v3.create(...car.scale);

        // Calculate the car's matrix
        car.matrix = twgl.m4.translate(viewProjectionMatrix, carTrans);
        car.matrix = twgl.m4.rotateX(car.matrix, car.rotation[0]);
        car.matrix = twgl.m4.rotateY(car.matrix, car.rotation[1]);
        car.matrix = twgl.m4.rotateZ(car.matrix, car.rotation[2]);
        car.matrix = twgl.m4.scale(car.matrix, carScale);

        // Set the uniforms for the cars
        let uniforms = {
            u_matrix: car.matrix,
        };

        // Set the uniforms for the cars and draw them
        twgl.setUniforms(programInfo, uniforms);
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
            console.log("Contenido del archivo OBJ cargado:", objText);
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
function parseOBJ(objText) {
    const positions = [];
    const normals = [];
    const texcoords = [];
    const indices = [];
    const texcoordIndices = [];
    const lines = objText.split("\n");

    lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0 || parts[0].startsWith("#")) return;

        switch (parts[0]) {
            case "v": // Vértices
                positions.push(...parts.slice(1).map(Number));
                break;
            case "vn": // Normales
                normals.push(...parts.slice(1).map(Number));
                break;
            case "vt": // Coordenadas de textura
                texcoords.push(...parts.slice(1).map(Number));
                break;
            case "f": // Caras
                const faceIndices = parts.slice(1).map((part) => {
                    const [vertexIndex] = part.split("/").map(Number);
                    return vertexIndex - 1;
                });
                for (let i = 1; i < faceIndices.length - 1; i++) {
                    indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
                }
                break;
        }
       
    });

    

    if (positions.length === 0 || indices.length === 0) {
        throw new Error("El archivo OBJ no contiene datos válidos de vértices o índices.");
    }

    const alignedTexcoords = [];
    indices.forEach((index, i) => {
        if (texcoordIndices.length > 0) {
            alignedTexcoords.push(texcoords[texcoordIndices[i] * 2] || 0);
            alignedTexcoords.push(texcoords[texcoordIndices[i] * 2 + 1] || 0);
        } else {
            alignedTexcoords.push(0); // Coordenada de textura predeterminada
            alignedTexcoords.push(0);
        }
    });

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
        a_texcoord: { numComponents: 2, data: alignedTexcoords },
        indices: { data: indices },
        
    };



}



function generateData(size, type) {
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
                data: type === 'buildings' ? [
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
                  //1.0ght 1.0                  1.033, 1.033, 1.033, 1, // v_5
                    1.033, 1.033, 1.033, 1, // v_5
                    1.033, 1.033, 1.033, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                  // Left Face
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                ] : type === 'roads' ? [
                    // Front face
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    // Back Face
                    0, 0, 0, 1, // v_2
                    0, 0, 0, 1, // v_2
                    0, 0, 0, 1, // v_2
                    0, 0, 0, 1, // v_2
                    // Top Face
                    0, 0, 0, 1, // v_3
                    0, 0, 0, 1, // v_3
                    0, 0, 0, 1, // v_3
                    0, 0, 0, 1, // v_3
                    // Bottom Face
                    0, 0, 0, 1, // v_4
                    0, 0, 0, 1, // v_4
                    0, 0, 0, 1, // v_4
                    0, 0, 0, 1, // v_4
                    // Right Face
                    0, 0, 0, 1, // v_5
                    0, 0, 0, 1, // v_5
                    0, 0, 0, 1, // v_5
                    0, 0, 0, 1, // v_5
                    // Left Face
                    0, 0, 0, 1, // v_6
                    0, 0, 0, 1, // v_6
                    0, 0, 0, 1, // v_6
                    0, 0, 0, 1, // v_6
                ] : type === 'trafficLights' ? [
                    // Front face
                    1, 1, 0, 1, // v_1
                    1, 1, 0, 1, // v_1
                    1, 1, 0, 1, // v_1
                    1, 1, 0, 1, // v_1
                    // Back Face
                    1, 1, 0, 1, // v_2
                    1, 1, 0, 1, // v_2
                    1, 1, 0, 1, // v_2
                    1, 1, 0, 1, // v_2
                    // Top Face
                    1, 1, 0, 1, // v_3
                    1, 1, 0, 1, // v_3
                    1, 1, 0, 1, // v_3
                    1, 1, 0, 1, // v_3
                    // Bottom Face
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    // Right Face
                    1, 1, 0, 1, // v_5
                    1, 1, 0, 1, // v_5
                    1, 1, 0, 1, // v_5
                    1, 1, 0, 1, // v_5
                    // Left Face
                    1, 1, 0, 1, // v_6
                    1, 1, 0, 1, // v_6
                    1, 1, 0, 1, // v_6
                    1, 1, 0, 1, // v_6
                ] : type === 'destinations' ? [
                    // Front face
                    0, 1, 0, 1, // v_1
                    0, 1, 0, 1, // v_1
                    0, 1, 0, 1, // v_1
                    0, 1, 0, 1, // v_1
                    // Back Face
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    // Top Face
                    0, 1, 0, 1, // v_3
                    0, 1, 0, 1, // v_3
                    0, 1, 0, 1, // v_3
                    0, 1, 0, 1, // v_3
                    // Bottom Face
                    0, 1, 0, 1, // v_4
                    0, 1, 0, 1, // v_4
                    0, 1, 0, 1, // v_4
                    0, 1, 0, 1, // v_4
                    // Right Face
                    0, 1, 0, 1, // v_5
                    0, 1, 0, 1, // v_5
                    0, 1, 0, 1, // v_5
                    0, 1, 0, 1, // v_5
                    // Left Face
                    0, 1, 0, 1, // v_6
                    0, 1, 0, 1, // v_6
                    0, 1, 0, 1, // v_6
                    0, 1, 0, 1, // v_6
                ] : type === 'cars' ? [
                    // Front face
                    0, 1, 1, 1, // v_1
                    0, 1, 1, 1, // v_1
                    0, 1, 1, 1, // v_1
                    0, 1, 1, 1, // v_1
                    // Back Face
                    0, 1, 1, 1, // v_2
                    0, 1, 1, 1, // v_2
                    0, 1, 1, 1, // v_2
                    0, 1, 1, 1, // v_2
                    // Top Face
                    0, 1, 1, 1, // v_3
                    0, 1, 1, 1, // v_3
                    0, 1, 1, 1, // v_3
                    0, 1, 1, 1, // v_3
                    // Bottom Face
                    0, 1, 1, 1, // v_4
                    0, 1, 1, 1, // v_4
                    0, 1, 1, 1, // v_4
                    0, 1, 1, 1, // v_4
                    // Right Face
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    // Left Face
                    0, 1, 1, 1, // v_6
                    0, 1, 1, 1, // v_6
                    0, 1, 1, 1, // v_6
                    0, 1, 1, 1, // v_6
                ] : [
                    // Front face
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    // Back Face
                    0, 0, 0, 1, // v_2
                    0, 0, 0, 1, // v_2
                    0, 0, 0, 1, // v_2
                    0, 0, 0, 1, // v_2
                    // Top Face
                    0, 0, 0, 1, // v_3
                    0, 0, 0, 1, // v_3
                    0, 0, 0, 1, // v_3
                    0, 0, 0, 1, // v_3
                    // Bottom Face
                    0, 0, 0, 1, // v_4
                    0, 0, 0, 1, // v_4
                    0, 0, 0, 1, // v_4
                    0, 0, 0, 1, // v_4
                    // Right Face
                    0, 0, 0, 1, // v_5
                    0, 0, 0, 1, // v_5
                    0, 0, 0, 1, // v_5
                    0, 0, 0, 1, // v_5
                    // Left Face
                    0, 0, 0, 1, // v_6
                    0, 0, 0, 1, // v_6
                    0, 0, 0, 1, // v_6
                    0, 0, 0, 1, // v_6
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


