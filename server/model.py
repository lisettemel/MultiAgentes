from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import *
import json

def print_dict(dictionary):
    print("{")
    for key in dictionary:
        print("    ", key, " : {")
        for key2 in dictionary[key]:
            print("        ", key2, " : ", dictionary[key][key2])
    print("    }")
    print("}")


class CityModel(Model):
    """ 
        Creates a model based on a city map.

        Args:
            N: Number of agents in the simulation
    """
    def __init__(self):

        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        dataDictionary = json.load(open("city_files/mapDictionary.json"))

        self.trafficLights = []
        self.destinations = []
        self.cars_count = 0
        self.step_count = 0
        self.arrived_cars = 0
        self.all_paths = {}

        # Load the map file. The map file is a text file where each character represents an agent.
        with open('city_files/2022_base.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0])-1
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus = False) 
            self.schedule = RandomActivation(self)

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col])
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col in ["R", "L", "U", "A", "r", "l", "u", "a"]:
                        agent = None
                        if col in ["R", "L", "U", "A"]:
                            agent = TrafficLight(f"tl_{r*self.width+c}", self, False, 17, dataDictionary[col])
                        elif col in ["r", "l", "u", "a"]:
                            agent = TrafficLight(f"tl_{r*self.width+c}", self, True, 5, dataDictionary[col])
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.schedule.add(agent)
                        self.trafficLights.append(agent)

                    elif col == "#":
                        agent = Building(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.destinations.append(agent)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

        self.corners = [(0, 0), (0, self.height-1), (self.width-1, 0), (self.width-1, self.height-1)]
        self.generate_new_cars()
        self.running = True

    def generate_new_cars(self):
        """
            Generates new cars in all the corners in the simulation.
            Args:
                None
            Returns:
                None
        """
        for corner in self.corners:
            random_destination = self.random.choice(self.destinations)
            # print("Destination: ", random_destination.pos)
            car = Car(f"c_{self.cars_count}", self, corner, random_destination)
            self.cars_count += 1
            self.grid.place_agent(car, corner)
            # print("Car: ", car.unique_id, " Place: ", corner, " Destination: ", random_destination.unique_id)
            self.schedule.add(car)

    def step(self):
        '''Advance the model by one step.'''
        self.step_count += 1
        # print("*************** All paths ***************")
        # print_dict(self.all_paths)
        if self.step_count % 10 == 0:
            self.generate_new_cars()
        self.schedule.step()