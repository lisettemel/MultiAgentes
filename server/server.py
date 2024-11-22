from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel, Building, Road, Destination, TrafficLight


app = Flask("")
cors = CORS(app, origins=['http://localhost'])

width = 28
height = 28
cityModel = None
currentStep = 0

with open('city_files/2022_base.txt') as baseFile:
    lines = baseFile.readlines()
    width = len(lines[0])-1
    height = len(lines)

# This route will be used to send the parameters of the simulation to the server.
# The servers expects a POST request with the parameters in a.json.
@app.route('/init', methods=['POST'])
@cross_origin()
def initModel():
    global cityModel
    if request.method == 'POST':
        try:        
            print(f"Model parameters:{width, height}")
            # Create the model using the parameters sent by the application
            if cityModel is None:
                cityModel = CityModel(width, height)
                # Return a message to saying that the model was created successfully
                return jsonify({
                    "message":"Parameters recieved, model initiated.",
                    "width":width,
                    "height":height
                })
            else:
                return jsonify({
                    "message":"Model already initiated",
                    "width":width,
                    "height":height
                })

        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500

# This route will be used to get the positions of the obstacles
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