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
        self.path = []
        self.path = self.a_star_search(self.model.grid, pos, self.destination.pos)

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

    def is_transitable(self, pos):
        return all(not isinstance(agent, Building) for agent in self.model.grid[pos])

    def a_star_search(self, grid, start, goal):
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
            neighbors = grid.get_neighborhood(current, moore=True, include_center=False)
            for next in neighbors:
                if self.is_transitable(next):
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
        print(self.path)
        pass

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
