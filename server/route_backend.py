#!/usr/bin/env python3

import sys
import json
import os
from pathlib import Path
import requests
import time
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Optional

# Load environment variables from .env file
def load_env_file():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env_file()

try:
    import osmnx as ox
    import networkx as nx
    from functools import lru_cache
    HAS_OSM_SUPPORT = True
except ImportError:
    HAS_OSM_SUPPORT = False
    print("Warning: osmnx/networkx not available. Using basic route generation.", file=sys.stderr)

GRAPHHOPPER_API_KEY = os.getenv('GRAPHHOPPER_API_KEY', '')  
GRAPHHOPPER_BASE_URL = "https://graphhopper.com/api/1"

route_cache = {}
isochrone_cache = {}

def format_distance(meters: float, unit_system: str) -> str:
    if unit_system == "imperial":
        if meters < 160.9:  # Less than 0.1 miles
            feet = meters * 3.28084
            return f"{feet:.0f} ft"
        else:
            miles = meters / 1609.34
            return f"{miles:.1f} mi"
    else:  # Metric
        if meters < 1000:
            return f"{meters:.0f} m"
        else:
            km = meters / 1000.0
            return f"{km:.1f} km"

@lru_cache(maxsize=128) if HAS_OSM_SUPPORT else lambda f: f
def get_graphhopper_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float, 
                         vehicle: str = "bike", avoid_hills: bool = False) -> Optional[Dict]:
    
    # Gets route from GraphHopper API 
    
    cache_key = f"{start_lat},{start_lon},{end_lat},{end_lon},{vehicle},{avoid_hills}"
    
    if cache_key in route_cache:
        return route_cache[cache_key]
    
    if not GRAPHHOPPER_API_KEY:
        print("Warning: No GraphHopper API key found.", file=sys.stderr)
        return None
    
    params = {
        "point": [f"{start_lat},{start_lon}", f"{end_lat},{end_lon}"],
        "vehicle": vehicle,
        "key": GRAPHHOPPER_API_KEY,
        "instructions": "true",
        "calc_points": "true",
        "debug": "true",
        "elevation": "true",
        "points_encoded": "false"
    }
    
    if avoid_hills:
        params["avoid"] = "hilly"
    
    try:
        response = requests.get(f"{GRAPHHOPPER_BASE_URL}/route", params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if "paths" in data and len(data["paths"]) > 0:
            route_cache[cache_key] = data
            return data
        else:
            print(f"GraphHopper API error: {data.get('message', 'Unknown error')}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"GraphHopper API request failed: {str(e)}", file=sys.stderr)
        return None

def load_osm_graph(location_data=None):
    # Loads OSM graph for bike network based on user location
    if not HAS_OSM_SUPPORT:
        return None
    
    try:
        # Default to Philadelphia if no location provided
        if location_data is None:
            location_data = {
                'place': 'Philadelphia, Pennsylvania, USA',
                'city': 'Philadelphia',
                'region': 'Pennsylvania',
                'country': 'US',
                'latitude': 39.9526,
                'longitude': -75.1652
            }
        
        place = location_data.get('place', 'Philadelphia, Pennsylvania, USA')
        lat = location_data.get('latitude', 39.9526)
        lon = location_data.get('longitude', -75.1652)
        
        # Use temp directory for graph storage
        temp_dir = Path(__file__).parent / 'temp' / 'osm_graphs'
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Create a filename based on location coordinates
        import hashlib
        location_key = f"{lat:.4f}_{lon:.4f}"
        location_hash = hashlib.md5(location_key.encode()).hexdigest()[:8]
        graph_filename = temp_dir / f"osm_graph_{location_hash}.graphml"
        
        # Tries to load existing graph
        if graph_filename.exists():
            print(f"Loading cached OSM graph for: {place} ({location_key})")
            return ox.load_graphml(str(graph_filename))
        else:
            # Download and save graph for the user's location
            print(f"Downloading OSM graph for: {place} ({location_key})")
            
            # Use coordinates for more precise graph downloading
            if lat and lon:
                # Download graph within 5km radius of the detected location
                G = ox.graph_from_point((lat, lon), dist=5000, network_type="bike")
            else:
                # Fallback to place name if coordinates not available
                G = ox.graph_from_place(place, network_type="bike")
            
            ox.save_graphml(G, str(graph_filename))
            print(f"💾 Saved OSM graph: {graph_filename.name}")
            return G
            
    except Exception as e:
        print(f"Warning: Could not load OSM graph for {place}: {str(e)}", file=sys.stderr)
        
        # Fallback to Philadelphia if user's location fails
        try:
            fallback_path = Path(__file__).parent / 'temp' / 'osm_graphs' / 'osm_graph_fallback.graphml'
            if fallback_path.exists():
                print("Falling back to cached Philadelphia OSM graph")
                return ox.load_graphml(str(fallback_path))
            else:
                print("Downloading fallback Philadelphia OSM graph")
                place = "Philadelphia, Pennsylvania, USA"
                G = ox.graph_from_place(place, network_type="bike")
                ox.save_graphml(G, str(fallback_path))
                return G
        except Exception as fallback_error:
            print(f"Warning: Fallback OSM graph also failed: {str(fallback_error)}", file=sys.stderr)
            return None

# Custom edge weight function for cycling
# Penalizes or rewards elevation gain based on avoid_hills, and penalizes non-bike lanes if requested
def cycling_edge_weight(u, v, d, preferences):
    length = d.get('length', 1) / 1000.0  
    
    # Base weight is distance
    weight = length
    
    # Bike lane preference
    if preferences.get('use_bike_lanes', True):
        if not any(tag in d for tag in ('cycleway', 'cycleway_left', 'cycleway_right')):
            weight += length * 0.5  # Penalize non-bike lanes if requested
    
    # Hill avoidance
    if preferences.get('avoid_hills', False):
        grade = d.get('grade', 0)
        if grade > 0:
            weight += grade * 10.0
    
    # Traffic avoidance
    if preferences.get('avoid_traffic', False):
        highway = d.get('highway', '')
        if highway in ['primary', 'trunk', 'motorway']:
            weight += length * 2.0
    
    return weight

def distance_heuristic(u, v, G):
    y1, x1 = G.nodes[u]['y'], G.nodes[u]['x']
    y2, x2 = G.nodes[v]['y'], G.nodes[v]['x']
    R = 6371.0  # Earth radius in km
    dlat = radians(y2 - y1)
    dlon = radians(x2 - x1)
    a = sin(dlat/2)**2 + cos(radians(y1)) * cos(radians(y2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))

def find_nearest_nodes(G, start_lat, start_lon, end_lat, end_lon):
    # Find nearest nodes in OSM graph
    if G is None or not HAS_OSM_SUPPORT:
        return None, None
    
    try:
        start_node = ox.distance.nearest_nodes(G, start_lon, start_lat)
        end_node = ox.distance.nearest_nodes(G, end_lon, end_lat)
        return start_node, end_node
    except Exception as e:
        print(f"Error finding nearest nodes: {str(e)}", file=sys.stderr)
        return None, None

def run_custom_astar(G, start_node, end_node, preferences):
    # Run custom A* algorithm with preferences that the user has set
    if G is None or start_node is None or end_node is None or not HAS_OSM_SUPPORT:
        return None
    
    try:
        return nx.astar_path(
            G,
            start_node,
            end_node,
            heuristic=lambda u, v: distance_heuristic(u, v, G),
            weight=lambda u, v, d: cycling_edge_weight(u, v, d, preferences)
        )
    except nx.NetworkXNoPath:
        print("No path found using A* algorithm", file=sys.stderr)
        return None

def process_graphhopper_instructions(gh_data, unit_system: str) -> List[Dict]:
    # Processes GraphHopper instructions into the format that we need
    if not gh_data or "paths" not in gh_data or len(gh_data["paths"]) == 0:
        return []
    
    path = gh_data["paths"][0]
    instructions = path.get("instructions", [])
    
    processed_instructions = []
    
    for i, instruction in enumerate(instructions):
        # Map GraphHopper instruction types to our types
        gh_sign = instruction.get("sign", 0)
        instruction_type = map_graphhopper_sign_to_type(gh_sign)
        
        processed_instructions.append({
            "instruction": instruction.get("text", "Continue"),
            "distance": format_distance(instruction.get("distance", 0), unit_system),
            "distance_raw": instruction.get("distance", 0),
            "duration": instruction.get("time", 0) / 1000.0,  # Convert ms to seconds
            "type": instruction_type,
            "modifier": None,
            "street_name": instruction.get("street_name", ""),
            "exit_number": instruction.get("exit_number"),
            "turn_angle": instruction.get("turn_angle")
        })
    
    return processed_instructions

def map_graphhopper_sign_to_type(sign: int) -> int:
    # Maps GraphHopper instruction signs to our instruction types
    mapping = {
        -7: 9,   # U-turn left -> U-turn
        -3: 0,   # Turn sharp left -> Left turn
        -2: 0,   # Turn left -> Left turn
        -1: 4,   # Turn slight left -> Slight left
        0: 6,    # Continue -> Continue
        1: 5,    # Turn slight right -> Slight right
        2: 1,    # Turn right -> Right turn
        3: 2,    # Turn sharp right -> Sharp right
        4: 10,   # Finish -> Destination
        5: 11,   # Via reached -> Start
        6: 8,    # Roundabout exit -> Exit roundabout
        7: 9,    # U-turn right -> U-turn
    }
    return mapping.get(sign, 6)  # Default to continue

def extract_route_coordinates(gh_data) -> List[Dict]:
    # Extracts route coordinates from the response from GraphHopper 
    if not gh_data or "paths" not in gh_data or len(gh_data["paths"]) == 0:
        return []
    
    path = gh_data["paths"][0]
    points = path.get("points", {}).get("coordinates", [])
    
    # GraphHopper returns [lon, lat] format. Switches the formatting to [lat, lon]
    route_coords = []
    for point in points:
        if len(point) >= 2:
            route_coords.append({
                "lat": point[1],
                "lon": point[0],
                "elevation": point[2] if len(point) > 2 else None
            })
    
    return route_coords

def calculate_route_elevation_from_coords(route_coords: List[Dict], unit_system: str) -> float:
    # Calculates elevation gain from route coordinates with elevation data from GraphHopper
    if len(route_coords) < 2:
        return 0.0
    
    total_elevation_gain = 0.0
    
    for i in range(len(route_coords) - 1):
        current_elev = route_coords[i].get('elevation')
        next_elev = route_coords[i + 1].get('elevation')
        
        if current_elev is not None and next_elev is not None:
            gain = next_elev - current_elev
            if gain > 0:
                total_elevation_gain += gain
    
    # If no elevation data, estimate based on distance
    if total_elevation_gain == 0:
        total_distance = calculate_total_distance(route_coords)
        total_elevation_gain = total_distance * 0.002  # 2m gain per km estimate
    
    if unit_system == "imperial":
        return total_elevation_gain * 3.28084  # Converts to feet
    return total_elevation_gain

def calculate_total_distance(route_coords: List[Dict]) -> float:
    # Calculate total distance of route in meters
    if len(route_coords) < 2:
        return 0.0
    
    total_distance = 0
    for i in range(len(route_coords) - 1):
        lat1, lon1 = route_coords[i]['lat'], route_coords[i]['lon']
        lat2, lon2 = route_coords[i + 1]['lat'], route_coords[i + 1]['lon']
        
        # Haversine distance
        R = 6371000  # Earth radius in meters
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = R * c
        total_distance += distance
    
    return total_distance

def optimize_route_with_astar(route_coords: List[Dict], preferences: Dict, G=None) -> List[Dict]:
    # Optimizes GraphHopper route using A* algorithm 
    # Use provided OSM graph or load default
    if G is None:
        G = load_osm_graph()
    if G is None:
        return route_coords
    
    # Find start and end points
    if len(route_coords) < 2:
        return route_coords
    
    start_coord = route_coords[0]
    end_coord = route_coords[-1]
    
    # Find nearest nodes
    start_node, end_node = find_nearest_nodes(
        G, start_coord['lat'], start_coord['lon'],
        end_coord['lat'], end_coord['lon']
    )
    
    if start_node is None or end_node is None:
        return route_coords
    
    # Run A* optimization
    optimized_path = run_custom_astar(G, start_node, end_node, preferences)
    
    if optimized_path is None:
        return route_coords
    
    # Convert optimized path back to coordinates
    optimized_coords = []
    for node in optimized_path:
        optimized_coords.append({
            "lat": G.nodes[node]['y'],
            "lon": G.nodes[node]['x'],
            "elevation": None
        })
    
    return optimized_coords

def generate_route(preferences: Dict) -> Dict:
    # Generate route using GraphHopper API with A* optimization
    start_lat = preferences['start_lat']
    start_lon = preferences['start_lon']
    end_lat = preferences.get('end_lat', start_lat)
    end_lon = preferences.get('end_lon', start_lon)
    target_distance = preferences.get('target_distance', 5.0)
    unit_system = preferences.get('unit_system', 'imperial')
    
    # Get user location data for OSM graph selection
    user_location = preferences.get('user_location', None)
    
    # Extract preferences
    avoid_hills = preferences.get('avoid_hills', False)
    include_elevation = preferences.get('include_elevation', False)
    use_bike_lanes = preferences.get('use_bike_lanes', True)
    avoid_traffic = preferences.get('avoid_traffic', False)
    points_of_interest = preferences.get('points_of_interest', False)
    prefer_greenways = preferences.get('prefer_greenways', False)
    include_scenic = preferences.get('include_scenic', False)
    route_type = preferences.get('route_type', 'scenic')
    
    # Load OSM graph based on user's location
    if HAS_OSM_SUPPORT and user_location:
        print(f"Loading OSM graph for user location: {user_location.get('place', 'Unknown')}")
        G = load_osm_graph(user_location)
    else:
        G = load_osm_graph()  # Fallback to default (Philadelphia)
    
    # Get route from GraphHopper
    gh_data = get_graphhopper_route(start_lat, start_lon, end_lat, end_lon, 
                                   vehicle="bike", avoid_hills=avoid_hills)
    
    if gh_data:
        # Extract route coordinates from GraphHopper
        route_coords = extract_route_coordinates(gh_data)
        
        # Use OSM graph for local optimization if available and appropriate
        if G is not None and any([use_bike_lanes, avoid_traffic, prefer_greenways]):
            print("Optimizing route using local OSM graph")
            route_coords = optimize_route_with_astar(route_coords, preferences, G)
        
        # Process instructions from GraphHopper
        instructions = process_graphhopper_instructions(gh_data, unit_system)
        
        # Calculate metrics
        total_distance_m = calculate_total_distance(route_coords)
        total_distance_km = total_distance_m / 1000.0
        
        # Calculates elevation
        if avoid_hills:
            elevation_gain = 0.0
        elif include_elevation:
            elevation_gain = calculate_route_elevation_from_coords(route_coords, unit_system) * 1.5
        else:
            elevation_gain = calculate_route_elevation_from_coords(route_coords, unit_system)

    
    return {
        "route": route_coords,
        "total_length_km": total_distance_km,
        "total_length_formatted": format_distance(total_distance_m, unit_system),
        "total_elevation_gain": elevation_gain,
        "instructions": instructions,
        "unit_system": unit_system,
        "preferences_used": {
            "avoid_hills": avoid_hills,
            "include_elevation": include_elevation,
            "use_bike_lanes": use_bike_lanes,
            "avoid_traffic": avoid_traffic,
            "points_of_interest": points_of_interest,
            "prefer_greenways": prefer_greenways,
            "include_scenic": include_scenic,
            "route_type": route_type
        },
        "data_source": "graphhopper" if gh_data else "fallback"
    }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'generate_route':
        try:
            input_data = sys.stdin.read()
            preferences = json.loads(input_data)
            result = generate_route(preferences)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
    else:
        print("Usage: python route_backend.py generate_route")
        sys.exit(1)

if __name__ == "__main__":
    main()
