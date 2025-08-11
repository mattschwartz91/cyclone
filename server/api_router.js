require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROUTING_APIS = {
    // Primary API (500 credits per day free tier). Limited to 5 locations per request
  GRAPHHOPPER: {
    url: 'https://graphhopper.com/api/1/route',
    key: process.env.GRAPHHOPPER_API_KEY || null,
  },

    // Secondary API (2000 requests per day free tier)
  OPENROUTESERVICE: {
    url: 'https://api.openrouteservice.org/v2/directions',
    key: process.env.ORS_API_KEY || null,
  },
    // Last resort API (no key needed, but limited features)
  OSRM: {
    url: 'https://router.project-osrm.org/route/v1',
    key: null,
  },
};

async function generateRoute(userPreferences) {
  try {
    const { start, end, options, userLocation } = userPreferences;
    const routeRequest = { start, end, options, userLocation };

    let routeData = null;

    // Try Python backend first if OSM support is needed for local optimization
    if (options.use_bike_lanes || options.avoid_traffic || options.prefer_greenways) {
      try {
        console.log('Using Python backend for advanced routing with OSM');
        routeData = await callPythonRouteBackend({
          start_lat: start.lat,
          start_lon: start.lon,
          end_lat: end?.lat || start.lat,
          end_lon: end?.lon || start.lon,
          user_location: userLocation,
          ...options
        });
        if (routeData) {
          console.log('Successfully used Python backend routing');
          return routeData;
        }
      } catch (error) {
        console.log('Python backend failed, trying external APIs:', error.message);
      }
    }

    if (ROUTING_APIS.GRAPHHOPPER.key) {
      try {
        routeData = await getGraphHopperRoute(routeRequest);
        if (routeData) {
          console.log('Successfully used GraphHopper routing');
          return routeData;
        }
      } catch (error) {
        console.log('GraphHopper failed, trying OpenRouteService:', error.message);
      }
    }

    if (ROUTING_APIS.OPENROUTESERVICE.key) {
      try {
        routeData = await getOpenRouteServiceRoute(routeRequest);
        if (routeData) {
          console.log('Successfully used OpenRouteService routing');
          return routeData;
        }
      } catch (error) {
        console.log('OpenRouteService failed, trying OSRM:', error.message);
      }
    }

    try {
      routeData = await getOSRMRoute(routeRequest);
      if (routeData) {
        console.log('Successfully used OSRM routing');
        return routeData;
      }
    } catch (error) {
      console.log('OSRM failed, using local generation:', error.message);
    }

    // Final fallback to local generation
    routeData = await generateBackendRoute(routeRequest);
    if (routeData) {
      console.log('Successfully used fallback routing');
      return routeData;
    }

    throw new Error('All routing methods failed');
  } catch (error) {
    console.error('Error generating route:', error.message);
    throw error;
  }
}

async function getOSRMRoute(routeRequest) {
  const { start, end, options } = routeRequest;

  // If no end point, create a route back to start
  const endPoint = end || start;
  const profile = 'cycling';
  const coordinates = `${start.lon},${start.lat};${endPoint.lon},${endPoint.lat}`;

  const url = `${ROUTING_APIS.OSRM.url}/${profile}/${coordinates}`;
  const params = {
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    annotations: 'true',
  };

  const response = await axios.get(url, { params, timeout: 10000 });

  if (response.data.routes && response.data.routes.length > 0) {
    const route = response.data.routes[0];
    return formatOSRMResponse(route, options);
  }

  return null;
}

function formatOSRMResponse(route, options) {
  const coordinates = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
  const distance = route.distance; // in meters
  const duration = route.duration; // in seconds

  // Generate instructions from OSRM
  const instructions = [];

  instructions.push({
    instruction: 'Begin your cycling route',
    distance: '0 ft',
    distance_raw: 0,
    duration: 0,
    duration_formatted: '0 sec',
    type: 11,
    modifier: null,
  });

  if (route.legs && route.legs[0] && route.legs[0].steps) {
    route.legs[0].steps.forEach((step, index) => {
      if (index === 0) return; // Skip first step (already added)

      const stepDistance = step.distance;
      const formattedDistance = formatDistance(stepDistance, options.unit_system);

      let instruction = step.maneuver.instruction || `Continue for ${formattedDistance}`;

      // Extract street name if available
      if (step.name && step.name !== '') {
        if (step.maneuver.type === 'turn') {
          const direction = step.maneuver.modifier === 'left' ? 'left' : 'right';
          instruction = `Turn ${direction} onto ${step.name}`;
        } else if (step.maneuver.type === 'continue') {
          instruction = `Continue on ${step.name} for ${formattedDistance}`;
        }
      }

      instructions.push({
        instruction,
        distance: formattedDistance,
        distance_raw: stepDistance,
        duration: step.duration,
        duration_formatted: formatDuration(step.duration),
        type: getInstructionType(step.maneuver.type, step.maneuver.modifier),
        modifier: step.maneuver.modifier,
        street_name: step.name || '',
      });
    });
  }

  instructions.push({
    instruction: 'Arrive at your destination',
    distance: '0 ft',
    distance_raw: 0,
    duration: 0,
    type: 10,
    modifier: null,
  });

  return {
    route: coordinates,
    total_length_km: distance / 1000,
    total_length_formatted: formatDistance(distance, options.unit_system),
    total_elevation_gain: estimateElevationGain(distance, options.unit_system),
    total_ride_time: formatDuration(duration / 60), // Convert seconds to minutes
    total_ride_time_minutes: duration / 60,
    instructions,
    unit_system: options.unit_system,
    data_source: 'osrm'
  };
}

async function getGraphHopperRoute(routeRequest) {
  const { start, end, options } = routeRequest;

  // If no end point, create a route back to start  
  const endPoint = end || start;
  
  // Build URL with properly formatted point parameters
  const baseUrl = `${ROUTING_APIS.GRAPHHOPPER.url}`;
  const startPoint = `${start.lat},${start.lon}`;
  const endPointStr = `${endPoint.lat},${endPoint.lon}`;

  // Creates a GraphHopper API URL to request a bike route between two points (start/end),
  // Returns turn-by-turn instructions in JSON format
  const url = `${baseUrl}?point=${encodeURIComponent(startPoint)}&point=${encodeURIComponent(endPointStr)}&vehicle=bike&key=${ROUTING_APIS.GRAPHHOPPER.key}&instructions=true&calc_points=true&type=json`;

  const params = {};

  console.log('GraphHopper Request:', {
    url,
    params,
  });

  const response = await axios.get(url, { timeout: 10000 });

  console.log('GraphHopper Response:', {
    status: response.status,
    data: response.data,
  });

  if (response.data.paths && response.data.paths.length > 0) {
    const route = response.data.paths[0];
    return formatGraphHopperResponse(route, options);
  }

  return null;
}

function formatGraphHopperResponse(route, options) {
  const coordinates = decodePolyline(route.points);
  const distance = route.distance; // in meters
  const duration = route.time; // in milliseconds

  // Generate instructions from GraphHopper
  const instructions = [];

  instructions.push({
    instruction: 'Begin your cycling route',
    distance: '0 ft',
    distance_raw: 0,
    duration: 0,
    type: 11,
    modifier: null,
  });

  if (route.instructions) {
    let hasDestinationInstruction = false;
    
    route.instructions.forEach((instruction, index) => {
      if (index === 0) return; // Skip first instruction

      const stepDistance = instruction.distance;
      const formattedDistance = formatDistance(stepDistance, options.unit_system);
      const stepDuration = instruction.time / 1000; // Convert ms to seconds
      const instructionType = getInstructionType(instruction.sign);
      
      if (instruction.text && (instruction.text.toLowerCase().includes('left') || instruction.text.toLowerCase().includes('right'))) {
        console.log(`Turn instruction: "${instruction.text}", sign: ${instruction.sign}, mapped type: ${instructionType}`);
      }
      
      if (instructionType === 10) {
        hasDestinationInstruction = true;
      }
      
      // Extract street name from instruction text
      const streetName = instruction.street_name || extractStreetName(instruction.text) || '';

      instructions.push({
        instruction: instruction.text || `Continue for ${formattedDistance}`,
        distance: formattedDistance,
        distance_raw: stepDistance,
        duration: stepDuration,
        duration_formatted: formatDuration(stepDuration),
        type: instructionType,
        modifier: null,
        street_name: streetName,
        sign: instruction.sign // Add sign for debugging
      });
    });
    
    // Only add destination instruction if GraphHopper didn't provide one
    if (!hasDestinationInstruction) {
      instructions.push({
        instruction: 'Arrive at your destination',
        distance: '0 ft',
        distance_raw: 0,
        duration: 0,
        type: 10,
        modifier: null,
      });
    }
  } else {
    // If no GraphHopper instructions, add a basic destination instruction
    instructions.push({
      instruction: 'Arrive at your destination',
      distance: '0 ft',
      distance_raw: 0,
      duration: 0,
      type: 10,
      modifier: null,
    });
  }

  // Calculates total ride time
  const totalRideTimeSeconds = duration / 1000; // Convert ms to seconds
  const totalRideTimeMinutes = totalRideTimeSeconds / 60; // Convert to minutes

  return {
    route: coordinates,
    total_length_km: distance / 1000,
    total_length_formatted: formatDistance(distance, options.unit_system),
    total_elevation_gain: estimateElevationGain(distance, options.unit_system),
    total_ride_time: formatDuration(totalRideTimeSeconds),
    total_ride_time_minutes: totalRideTimeMinutes,
    instructions,
    unit_system: options.unit_system,
    data_source: 'graphhopper'
  };
}

async function getOpenRouteServiceRoute(routeRequest) {
  const { start, end, options } = routeRequest;

  // If no end point, create a route back to start
  const endPoint = end || start;
  
  const url = `${ROUTING_APIS.OPENROUTESERVICE.url}/cycling-regular`;
  const params = {
    api_key: ROUTING_APIS.OPENROUTESERVICE.key,
    start: `${start.lon},${start.lat}`,
    end: `${endPoint.lon},${endPoint.lat}`,
    format: 'json',
    instructions: 'true',
    geometry: 'true',
  };

  const response = await axios.get(url, { params, timeout: 10000 });

  if (response.data.features && response.data.features.length > 0) {
    const route = response.data.features[0];
    return formatOpenRouteServiceResponse(route, options);
  }

  return null;
}

function formatOpenRouteServiceResponse(route, options) {
  const coordinates = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
  const distance = route.properties.summary.distance; // in meters
  const duration = route.properties.summary.duration; // in seconds

  // Generate instructions from OpenRouteService
  const instructions = [];

  instructions.push({
    instruction: 'Begin your cycling route',
    distance: '0 ft',
    distance_raw: 0,
    duration: 0,
    type: 11,
    modifier: null,
  });

  if (route.properties.segments && route.properties.segments[0].steps) {
    route.properties.segments[0].steps.forEach((step, index) => {
      if (index === 0) return; // Skip first step

      const stepDistance = step.distance;
      const formattedDistance = formatDistance(stepDistance, options.unit_system);
      const stepDurationMinutes = step.duration / 60; // Convert to minutes
      
      // Extract street name from instruction
      const streetName = step.name || extractStreetName(step.instruction) || '';

      instructions.push({
        instruction: step.instruction || `Continue for ${formattedDistance}`,
        distance: formattedDistance,
        distance_raw: stepDistance,
        duration: stepDurationMinutes,
        duration_formatted: formatDuration(stepDurationMinutes),
        type: getInstructionType(step.type),
        modifier: null,
        street_name: streetName,
      });
    });
  }

  instructions.push({
    instruction: 'Arrive at your destination',
    distance: '0 ft',
    distance_raw: 0,
    duration: 0,
    type: 10,
    modifier: null,
  });

  // Calculate total ride time
  const totalRideTimeMinutes = duration / 60; // Convert to minutes

  return {
    route: coordinates,
    total_length_km: distance / 1000,
    total_length_formatted: formatDistance(distance, options.unit_system),
    total_elevation_gain: estimateElevationGain(distance, options.unit_system),
    total_ride_time: formatDuration(totalRideTimeMinutes),
    total_ride_time_minutes: totalRideTimeMinutes,
    instructions,
    unit_system: options.unit_system,
    data_source: 'openrouteservice'
  };
}

function getInstructionType(graphHopperSign) {
  // Handle specific left turn cases first
  if (graphHopperSign === -2) return 0;  // Turn left
  if (graphHopperSign === -3) return 0;  // Turn sharp left
  if (graphHopperSign === -1) return 4;  // Turn slight left
  if (graphHopperSign === -7) return 9;  // U-turn left
  if (graphHopperSign === -6) return 12; // Keep left
  
  // Handle right turns and other positive signs
  if (graphHopperSign === 2) return 1;   // Turn right
  if (graphHopperSign === 3) return 2;   // Turn sharp right
  if (graphHopperSign === 1) return 5;   // Turn slight right
  if (graphHopperSign === 7) return 13;  // Keep right
  
  // Handle special signs
  if (graphHopperSign === 0) return 6;   // Continue
  if (graphHopperSign === 4) return 10;  // Finish/Destination
  if (graphHopperSign === 5) return 11;  // Start
  if (graphHopperSign === 6) return 8;   // Roundabout exit
  
  // OpenRouteService compatibility
  if (graphHopperSign === 10) return 10;  // Finish
  if (graphHopperSign === 11) return 11;  // Start
  if (graphHopperSign === 13) return 13;  // Keep right
  
  // Default to continue
  return 6;
}

function formatDistance(meters, unitSystem) {
  if (unitSystem === 'imperial') {
    if (meters < 160.9) {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    } else {
      const miles = meters / 1609.34;
      return `${miles.toFixed(1)} mi`;
    }
  } else {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      const km = meters / 1000;
      return `${km.toFixed(1)} km`;
    }
  }
}

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (remainingSeconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${remainingSeconds} sec`;
    }
  }
}

function estimateElevationGain(distance, unitSystem) {
  // Estimate elevation gain based on distance
  const elevationGainM = distance * 0.002; // 2m per km average

  if (unitSystem === 'imperial') {
    return elevationGainM * 3.28084; // Convert to feet
  }
  return elevationGainM;
}

function extractStreetName(instruction) {
  if (!instruction || typeof instruction !== 'string') return '';
  
  // Common patterns to extract street names from instructions
  const patterns = [
    /onto (.+?)(?:\sfor|\.|$)/i,
    /on (.+?)(?:\sfor|\.|$)/i,
    /turn.*onto (.+?)(?:\s|$)/i,
    /continue.*on (.+?)(?:\s|$)/i,
    /follow (.+?)(?:\s|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = instruction.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

function callPythonRouteBackend(preferences) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, 'route_backend.py');
    const venvPythonPath = path.join(__dirname, 'venv', 'bin', 'python3');
    
    // Use virtual environment Python if it exists, otherwise fallback to system Python
    const pythonCommand = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python3';
    const python = spawn(pythonCommand, [pythonScriptPath, 'generate_route']);

    let outputData = '';
    let errorData = '';

    // Send preferences to Python script
    python.stdin.write(JSON.stringify(preferences));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorData}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

async function generateBackendRoute(routeRequest) {
  const { start, end, options } = routeRequest;

  // Includes street based waypoints
  const waypoints = generateStreetBasedWaypoints(start, end, options.target_distance);

  // Calculate total distance
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
  }

  // Generate street-based instructions
  const instructions = generateStreetNameInstructions(waypoints, options);

  return {
    route: waypoints,
    total_length_km: totalDistance / 1000,
    total_length_formatted: formatDistance(totalDistance, options.unit_system),
    total_elevation_gain: estimateElevationGain(totalDistance, options.unit_system),
    instructions,
    unit_system: options.unit_system,
  };
}

function generateStreetBasedWaypoints(start, end, targetDistance) {
  const points = [];
  const numPoints = Math.max(20, Math.floor(targetDistance * 4)); // More points for longer routes

  // If no end point, generate a circular route
  const endPoint = end || start;

  for (let i = 0; i < numPoints; i++) {
    const factor = i / (numPoints - 1);

    const baseLatOffset = (endPoint.lat - start.lat) * factor;
    const baseLonOffset = (endPoint.lon - start.lon) * factor;

    const streetVariation = 0.001;
    const latVariation = Math.sin(i * 0.5) * streetVariation;
    const lonVariation = Math.cos(i * 0.3) * streetVariation;

    points.push({
      lat: start.lat + baseLatOffset + latVariation,
      lon: start.lon + baseLonOffset + lonVariation,
    });
  }

  return points;
}

function decodePolyline(encoded) {
  // Decode Google polyline algorithm (used by GraphHopper)
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ lat: lat / 1e5, lon: lng / 1e5 });
  }

  return points;
}

function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lon - point1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) * Math.cos((point2.lat * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { generateRoute };
