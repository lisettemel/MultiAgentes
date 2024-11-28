from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel, Building, Road, Destination, TrafficLight, Car


app = Flask("")
cors = CORS(app, origins=['http://localhost'])

cityModel = None

# This route will be used to send the parameters of the simulation to the server.
# The servers expects a POST request with the parameters in a.json.
@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    global cityModel
    if request.method == 'POST':
        try:
            # Create the model using the parameters sent by the application
            if cityModel is None:
                cityModel = CityModel()
                # Return a message to saying that the model was created successfully
                return jsonify({
                    "message":"Parameters recieved, model initiated.",
                    "width": cityModel.width,
                    "height": cityModel.height
                })
            else:
                return jsonify({
                    "message":"Model already initiated",
                    "width": cityModel.width,
                    "height": cityModel.height
                })

        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500

@app.route('/reset', methods=['POST'])
@cross_origin()
def resetModel():
    global cityModel
    if request.method == 'POST':
        try:
            # Create the model using the parameters sent by the application
            cityModel = CityModel()
            return jsonify({
                "message":"Parameters recieved, model initiated.",
                "width": cityModel.width,
                "height": cityModel.height
            })
        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500


# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global cityModel
    if request.method == 'GET':
        try:
            # Update the model and return a message to WebGL saying that the model was updated successfully
            cityModel.step()
            return jsonify({
                'message': f'Model updated to step <replace to step>',
                'step': cityModel.step_count,
                'total': cityModel.arrived_cars
            })
        except Exception as e:
            print(e)
            return jsonify({"message":"Error during step."}), 500

# This route will be used to get the positions of the cars
@app.route('/get-cars', methods=['GET'])
@cross_origin()
def getCars():
    global cityModel
    if request.method == 'GET':
        try:
            # Get the positions of the cars and return them to WebGL in JSON.json.
            # The positions are sent as a list of dictionaries, where each dictionary has the id and position of a car.
            carPositions = []
            for agent in cityModel.schedule.agents:
                if isinstance(agent, Car):
                    carPositions.append({
                        "id": str(agent.unique_id), 
                        "x": agent.pos[0],
                        "y": 0,
                        "dir": agent.direction,
                        "z": agent.pos[1]
                    })

            trafficLights = []
            for agent in cityModel.schedule.agents:
                if isinstance(agent, TrafficLight):
                    trafficLights.append({
                        "id": str(agent.unique_id),
                        "x": agent.pos[0],
                        "y": 1,
                        "z": agent.pos[1],
                        "state": agent.state
                    })
                    

            return jsonify({
                "cars": carPositions,
                "trafficLights": trafficLights
            })

        except Exception as e:
            print(e)
            return jsonify({"message":"Error with car positions"}), 500

# This route will be used to get the positions of all the city objects
@app.route('/get-city', methods=['GET'])
@cross_origin()
def getCity():
    global cityModel
    if request.method == 'GET':
        try:
            # Get the positions of the objects and return them to WebGL in JSON.json.t.
            # Same as before, the positions are sent as a list of dictionaries, where each dictionary has the id and position of an object.
            buildingPositions = []
            roadsPositions = []
            destinationsPositions = []
            trafficLightPositions = []
            for agents, (x, z) in cityModel.grid.coord_iter():
                for agent in agents:
                    if isinstance(agent, Building):
                        buildingPositions.append({
                            "id": str(agent.unique_id),
                            "x": x,
                            "y":1,
                            "z":z
                        })
                    elif isinstance(agent, Road):
                        roadsPositions.append({
                            "id": str(agent.unique_id), 
                            "x": x, 
                            "y":1, 
                            "z":z
                        })
                    elif isinstance(agent, Destination):
                        destinationsPositions.append({
                            "id": str(agent.unique_id), 
                            "x": x, 
                            "y":1, 
                            "z":z
                        })
                    elif isinstance(agent, TrafficLight):
                        trafficLightPositions.append({
                            "id": str(agent.unique_id), 
                            "x": x, 
                            "y":1, 
                            "z":z
                        })

            return jsonify({
                "buildings": buildingPositions,
                "roads": roadsPositions,
                "destinations": destinationsPositions,
                "trafficLights": trafficLightPositions
            })

        except Exception as e:
            print(e)
            return jsonify({"message":"Error with city objects positions"}), 500

if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)