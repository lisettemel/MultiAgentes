from mesa import Agent
import math
import heapq

class Car(Agent):
    """
    Agent that moves randomly.
    Attributes:
        unique_id: Agent's ID 
        direction: Randomly chosen direction chosen from one of eight directions
    """
    def __init__(self, unique_id, model, pos, destination):
        """
        Creates a new random agent.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
        """
        super().__init__(unique_id, model)
        self.state = "moving"
        self.destination = destination
        self.last_known_direction = [agent for agent in self.model.grid[pos] if isinstance(agent, Road)][0]
        self.path = self.a_star_search(pos, self.destination.pos)
        for agent in self.model.grid[pos]:
            if isinstance(agent, Road) or isinstance(agent, TrafficLight):
                self.direction = agent.direction
        # if pos in self.model.all_paths:
        #     if destination.pos in self.model.all_paths[pos]:
        #         self.path = self.model.all_paths[pos][destination.pos]
        #     else:
        #         self.path = self.a_star_search(pos, self.destination.pos)
        #         if self.path:
        #             self.model.all_paths[pos][destination.pos] = self.path
        # else:
        #     self.path = self.a_star_search(pos, self.destination.pos)
        #     if self.path:
        #         self.model.all_paths[pos] = {}
        #         self.model.all_paths[pos][destination.pos] = self.path

    def heuristic(self, a, b):
        """
        Calculates the distance between A and B.
        Args:
            a: Point A
            b: Point B
        Returns:
            The distance between the A and B
        """
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)



    def get_transitable_neighbors(self, current):
        """
        Get the neighbors that are transitable based on road direction, traffic light behavior, and not buildings.
        Args:
            current: The current position of the agent.
        Returns:
            A list of the neighbors that are transitable and follow road direction rules.
        """
        possible_moves = []
        neighbors = self.model.grid.get_neighborhood(current, moore=True, include_center=False)

        # # Identify the current cell type: Road, TrafficLight, or other
        current_direction = None
        for agent in self.model.grid.get_cell_list_contents(current):
            if isinstance(agent, Road) or isinstance(agent, TrafficLight):
                current_direction = agent.direction  # Use the direction of the current Road
                break
        #     elif isinstance(agent, TrafficLight):
        #         current_direction = self.last_known_direction  # Use the last known direction when on a TrafficLight
        #         break

        # # If no direction is determined (e.g., on a non-transitable cell), return an empty list
        if not current_direction:
            return possible_moves
        
        for neighbor in neighbors:
            contents = self.model.grid.get_cell_list_contents(neighbor)
            # print(f"Contents of ({neighbor[0]}, {neighbor[1]}): {contents}")
            for agent in contents:
                if isinstance(agent, Destination):
                    if agent.pos == self.destination.pos:
                        possible_moves.append(neighbor)
                elif not isinstance(agent, Building):
                    if isinstance(agent, Road) or isinstance(agent, TrafficLight):


                        if current_direction == 'Up' and agent.pos[1] >= current[1] and agent.direction != 'Down':
                            if agent.direction == 'Left' and agent.pos[0] <= current[0]:
                                self.last_known_direction = 'Left'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Right' and agent.pos[0] >= current[0]:
                                self.last_known_direction = 'Right'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Up' and agent.pos[1] >= current[1]:
                                self.last_known_direction = 'Up'
                                possible_moves.append(neighbor)


                        elif current_direction == 'Down' and agent.pos[1] < current[1] and agent.direction != 'Up':
                            if agent.direction == 'Left' and agent.pos[0] <= current[0]:
                                self.last_known_direction = 'Left'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Right' and agent.pos[0] >= current[0]:
                                self.last_known_direction = 'Right'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Down' and agent.pos[1] <= current[1]:
                                self.last_known_direction = 'Down'
                                possible_moves.append(neighbor)


                        elif current_direction == 'Right' and agent.pos[0] >= current[0] and agent.direction != 'Left':
                            if agent.direction == 'Up' and agent.pos[1] >= current[1]:
                                self.last_known_direction = 'Up'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Down' and agent.pos[1] <= current[1]:
                                self.last_known_direction = 'Down'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Right' and agent.pos[0] >= current[0]:
                                self.last_known_direction = "Right"
                                possible_moves.append(neighbor)


                        elif current_direction == 'Left' and agent.pos[0] < current[0] and agent.direction != 'Right':
                            self.last_known_direction = 'Left'
                            if agent.direction == 'Up' and agent.pos[1] >= current[1]:
                                self.last_known_direction = 'Up'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Down' and agent.pos[1] <= current[1]:
                                self.last_known_direction = 'Down'
                                possible_moves.append(neighbor)
                            elif agent.direction == 'Left' and agent.pos[0] <= current[0]:
                                self.last_known_direction = 'Left'
                                possible_moves.append(neighbor)
                        
                        # if current_direction == 'Up' and agent.pos[1] > current[1] and agent.pos[0] == current[0]:
                        #     possible_moves.append(neighbor)
                        # elif current_direction == 'Down' and agent.pos[1] < current[1] and agent.pos[0] == current[0]:
                        #     possible_moves.append(neighbor)
                        # elif current_direction == 'Right' and agent.pos[0] > current[0] and agent.pos[0] == current[0]:
                        #     possible_moves.append(neighbor)
                        # elif current_direction == 'Left' and agent.pos[0] < current[0] and agent.pos[0] == current[0]:
                        #     possible_moves.append(neighbor)

        return possible_moves


    def a_star_search(self, start, goal):
        # print("New A* Search")
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {}
        cost_so_far = {}
        came_from[start] = None
        cost_so_far[start] = 0
        
        while frontier:

            current = heapq.heappop(frontier)[1]
            if current == goal:
                # print(f"Frontier: {frontier}")
                # print(f"Came_from: {came_from}")
                # print(f"Cost_so_far: {cost_so_far}")
                break
            neighbors = self.get_transitable_neighbors(current)
            # if not neighbors:
            #     return self.reconstruct_path(came_from, start, current)
            for next in neighbors:
                new_cost = cost_so_far[current] + 1
                if next not in cost_so_far or new_cost < cost_so_far[next]:
                    cost_so_far[next] = new_cost
                    priority = new_cost + self.heuristic(goal, next)
                    heapq.heappush(frontier, (priority, next))
                    came_from[next] = current
        else: # No break
            # print("Frontier: ", frontier)
            # print("Error: No path found.")
            return []
        return self.reconstruct_path(came_from, start, goal)

    def reconstruct_path(self, came_from, start, goal):
        current = goal
        path = []
        while current != start:
            if current not in came_from:
                # print(f"Error: Node {current} not in came_from.")
                return path  # Devuelve el camino parcial
            path.append(current)
            current = came_from[current]
        path.reverse()
        return path

    def move(self):
        """ 
        Determines if the agent can move in the direction that was chosen
        """
        if self.path:
            next_move = self.path[0]
            for agent in self.model.grid[next_move]:
                if isinstance(agent, Road) or isinstance(agent, TrafficLight):
                    self.direction = agent.direction
            for agent in self.model.grid.get_cell_list_contents(next_move):
                if isinstance(agent, TrafficLight):
                    # print(f"Traffic Light {agent.unique_id} is {agent.state}")
                    if agent.state == False:
                        return
                elif isinstance(agent, Car):
                    return
            next_move = self.path.pop(0)
            self.model.grid.move_agent(self, next_move)
        else:
            self.model.grid.remove_agent(self)
            self.model.schedule.remove(self)

    def step(self):
        """ 
        Determines the new direction it will take, and then moves
        """
        if self.state == "moving":
            self.move()

class TrafficLight(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, unique_id, model, state = False, timeToChange = 10, direction = "Up"):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many step should the traffic light change color 
        """
        self.state = state
        self.timeToChange = timeToChange
        self.direction = direction

    def step(self):
        """ 
        To change the state (green or red) of the traffic light in case you consider the time to change of each traffic light.
        """
        if self.model.schedule.steps % self.timeToChange == 0:
            self.state = not self.state

class Destination(Agent):
    """
    Destination agent. Where each car should go.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Building(Agent):
    """
    Building agent. Just to add builgins to the grid.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, unique_id, model, direction= "Left"):
        """
        Creates a new road.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            direction: Direction where the cars can move
        """
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass
