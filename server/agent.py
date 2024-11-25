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
        current_road = [agent for agent in self.model.grid[pos] if isinstance(agent, Road)][0]
        self.direction = current_road.direction
        self.path = []
        self.path = self.a_star_search(pos, self.destination.pos)

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
        Get the neighbors that are not buildings buildings.
        Args:
            current: The current position of the agent
        Returns:
            A list of the neighbors that are not buildings.
        """
        possible_moves = []

        neighbors = self.model.grid.get_neighborhood(current, moore=True, include_center=False)
        for neighbor in neighbors:
            for agent in self.model.grid.get_cell_list_contents(neighbor):
                if isinstance(agent, Destination):
                    if agent.pos == self.destination.pos:
                        possible_moves.append(neighbor)
                elif not isinstance(agent, Building):
                    current_road = None
                    if isinstance(agent, Road):
                        possible_moves.append(neighbor)
                        # current_road = [agent for agent in self.model.grid.get_cell_list_contents(current) if isinstance(agent, Road)]
                        # if current_road:
                        #     current_road = current_road[0]
                    # elif isinstance(agent, TrafficLight):
                        
                    
                    else:
                        possible_moves.append(neighbor)


                    # if current_road.direction == 'Right' and agent.pos[0] > current_road.pos[0]:
                    #     print("Right")
                    #     print("Current: ", current_road.pos)
                    #     print("Next: ", agent.pos)
                    #     possible_moves.append(neighbor)
        return possible_moves

    def a_star_search(self, start, goal):
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {}
        cost_so_far = {}
        came_from[start] = None
        cost_so_far[start] = 0
        
        while frontier:
            current = heapq.heappop(frontier)[1]
            if current == goal:
                break
            neighbors = self.get_transitable_neighbors(current)
            for next in neighbors:
                new_cost = cost_so_far[current] + 1
                if next not in cost_so_far or new_cost < cost_so_far[next]:
                    cost_so_far[next] = new_cost
                    priority = new_cost + self.heuristic(goal, next)
                    heapq.heappush(frontier, (priority, next))
                    came_from[next] = current
        return self.reconstruct_path(came_from, start, goal)

    def reconstruct_path(self, came_from, start, goal):
        current = goal
        path = []
        while current != start:
            path.append(current)
            current = came_from[current]
        path.reverse()
        return path

    def move(self):
        """ 
        Determines if the agent can move in the direction that was chosen
        """
        if self.path:
            next_move = self.path.pop(0)
            self.model.grid.move_agent(self, next_move)

    def step(self):
        """ 
        Determines the new direction it will take, and then moves
        """
        print(self.direction)
        if self.state == "moving":
            self.move()

class TrafficLight(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, unique_id, model, state = False, timeToChange = 10):
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
