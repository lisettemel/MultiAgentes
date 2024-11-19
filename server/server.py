from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from model import CityModel


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
            print(request.json)
            print(f"Model parameters:{width, height}")
            # Create the model using the parameters sent by the application
            cityModel = CityModel(width, height)
            # Return a message to saying that the model was created successfully
            return jsonify({"message":"Parameters recieved, model initiated."})

        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500


if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)