from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import osmnx as ox
import math
import networkx as nx
from math import radians, cos, sin, sqrt, atan2
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

# Enable CORS for all origins and methods
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoutePreferences(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    avoid_hills: Optional[bool] = False
    use_bike_lanes: Optional[bool] = True
    target_distance_distance: Optional[float] = None
    max_elevation_gain: Optional[float] = None

# Load the graph once at startup
G_PHILLY = ox.load_graphml("philly_bike.graphml")

# Custom edge weight function for cycling
# Penalizes or rewards elevation gain based on avoid_hills, and penalizes non-bike lanes if requested

def cycling_edge_weight(u, v, d, preferences):
    # Base cost = length (km)
    length = d.get('length', 1) / 1000.0

    # Penalize non-bike lanes if requested
    bike_penalty = 0
    if preferences.use_bike_lanes:
        if not any(tag in d for tag in ('cycleway', 'cycleway_left', 'cycleway_right')):
            bike_penalty = 1.0

    # Elevation penalty/reward
    elev_gain = max(0, d.get('grade', 0))
    if preferences.avoid_hills:
        elevation_penalty = elev_gain * 10.0
    else:
        elevation_penalty = -elev_gain * 10.0

    return length + bike_penalty + elevation_penalty


def distance_heuristic(u, v, G):
    y1, x1 = G.nodes[u]['y'], G.nodes[u]['x']
    y2, x2 = G.nodes[v]['y'], G.nodes[v]['x']
    R = 6371.0  # Earth radius in km
    dlat = radians(y2 - y1)
    dlon = radians(x2 - x1)
    a = sin(dlat/2)**2 + cos(radians(y1)) * cos(radians(y2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def find_nearest_nodes(G, preferences):
    start_node = ox.distance.nearest_nodes(G, preferences.start_lon, preferences.start_lat)
    end_node   = ox.distance.nearest_nodes(G, preferences.end_lon, preferences.end_lat)
    return start_node, end_node


def run_custom_astar(G, start_node, end_node, preferences):
    try:
        return nx.astar_path(
            G,
            start_node,
            end_node,
            heuristic=lambda u, v: distance_heuristic(u, v, G),
            weight=lambda u, v, d: cycling_edge_weight(u, v, d, preferences)
        )
    except nx.NetworkXNoPath:
        return None


def find_via_node_for_target(G, start, end, target_km):
    """
    Find a node 'via' such that
      dist(start→via) + dist(via→end)
    is as close to target_km as possible (using pure-length).
    """
    target_m = target_km * 1000.0
    cutoff = target_m * 1.5

    # Dijkstra from start and end, weighted by 'length' (meters)
    dist_from_start = nx.single_source_dijkstra_path_length(G, start, cutoff=cutoff, weight='length')
    dist_from_end   = nx.single_source_dijkstra_path_length(G, end,   cutoff=cutoff, weight='length')

    best_node, best_diff = None, float('inf')
    for node, d1 in dist_from_start.items():
        d2 = dist_from_end.get(node)
        if d2 is None:
            continue
        total = d1 + d2
        diff = abs(total - target_m)
        if diff < best_diff:
            best_diff, best_node = diff, node

    return best_node


def format_route_response(G, path, preferences, start_node, end_node):
    if not path:
        return {"error": "No path found"}

    total_length = sum(
        G[u][v][0].get('length', 1) / 1000.0
        for u, v in zip(path[:-1], path[1:])
    )
    distance_diff = None
    if preferences.target_distance_distance is not None:
        distance_diff = abs(total_length - preferences.target_distance_distance)

    route_coords = [
        {"lat": G.nodes[n]['y'], "lon": G.nodes[n]['x']}
        for n in path
    ]

    return {
        "route": route_coords,
        "total_length_km": total_length,
        "distance_diff_km": distance_diff,
        "start_node": start_node,
        "end_node": end_node,
        "num_nodes": len(G.nodes),
        "num_edges": len(G.edges),
    }


def random_route(G, start, target_km, max_attempts=1000):
    """
    Generate a random path starting and ending at 'start', as close as possible to target_km.
    Returns a list of node IDs or None if not found.
    """
    target_m = target_km * 1000
    for _ in range(max_attempts):
        path = [start]
        total_length = 0
        current = start
        visited = set([start])
        while total_length < target_m:
            neighbors = [n for n in G.neighbors(current) if n not in visited]
            if not neighbors:
                break
            next_node = random.choice(neighbors)
            edge_data = G[current][next_node][0]
            total_length += edge_data.get('length', 1)
            path.append(next_node)
            visited.add(next_node)
            # Try to close the loop if close to target
            if abs(total_length - target_m) < 200 and next_node == start:
                return path
        # If not a loop, return the path if close enough
        if abs(total_length - target_m) < 200:
            return path
    return None


def dfs_paths_for_target_ptp(G, start, end, target_km, max_depth=40, tolerance=0.2, max_routes=10):
    """
    DFS to find up to max_routes point-to-point paths from start to end as close as possible to target_km.
    Returns a list of node ID lists (paths).
    """
    target_m = target_km * 1000
    valid_routes = []

    def dfs(current, path, total_length, depth):
        if len(valid_routes) >= max_routes:
            return
        if depth > max_depth:
            return
        if current == end and len(path) > 1 and abs(total_length - target_m) < tolerance * target_m:
            valid_routes.append(list(path))
            return
        for neighbor in G.neighbors(current):
            if neighbor in path:
                continue
            edge_data = G[current][neighbor][0]
            length = edge_data.get('length', 1)
            if total_length + length > target_m * (1 + tolerance):
                continue
            path.append(neighbor)
            dfs(neighbor, path, total_length + length, depth + 1)
            path.pop()

    dfs(start, [start], 0, 0)
    return valid_routes

@app.post("/api/generate-custom-route")
async def generate_custom_route(preferences: RoutePreferences):
    G = G_PHILLY
    start_node, end_node = find_nearest_nodes(G, preferences)

    # If a target distance is given, use the point-to-point DFS approach
    if preferences.target_distance_distance:
        valid_routes = dfs_paths_for_target_ptp(G, start_node, end_node, preferences.target_distance_distance)
        if valid_routes:
            path = random.choice(valid_routes)
        else:
            # Fallback to direct A*
            path = run_custom_astar(G, start_node, end_node, preferences)
    else:
        # No target specified, just direct A*
        path = run_custom_astar(G, start_node, end_node, preferences)

    return format_route_response(G, path, preferences, start_node, end_node)