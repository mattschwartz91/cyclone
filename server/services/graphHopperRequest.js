const axios = require('axios');
const { ROUTING_APIS } = require('../config/config');
const { decodeGraphHopperPolyline } = require('../utils/polylineDecoder');
const { formatDuration } = require('../utils/formatters');
// const { formatDistance } = require('../utils/formatters'); 
const { getInstructionType } = require('../utils/instructionMappers');
const { extractStreetName } = require('../utils/extractStreet');

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
  const coordinates = decodeGraphHopperPolyline(route.points);
  const distance = route.distance; // in meters
  const duration = route.time; // in milliseconds

  console.log('GraphHopper options received:', {
    starting_point_name: options.starting_point_name,
    destination_name: options.destination_name
  });

  // Generate instructions from GraphHopper
  const instructions = [];

  if (route.instructions) {
    let hasDestinationInstruction = false;
    
    route.instructions.forEach((instruction, index) => {
      const stepDistance = instruction.distance;
      const stepDuration = instruction.time / 1000; // Convert ms to seconds
      const instructionType = getInstructionType(instruction.sign);
      
      if (instruction.text && (instruction.text.toLowerCase().includes('left') || instruction.text.toLowerCase().includes('right'))) {
        console.log(`Turn instruction: "${instruction.text}", sign: ${instruction.sign}, mapped type: ${instructionType}`);
      }
      
      if (instructionType === 10) {
        hasDestinationInstruction = true;
      }
      
      const streetName = instruction.street_name || extractStreetName(instruction.text) || '';

      let instructionText = instruction.text;
      
      // Skip very short distance instructions
      if (stepDistance < 50 && instructionText && 
          (instructionText.toLowerCase().includes('turn') || 
           instructionText.toLowerCase().includes('sharp'))) {
        console.log(`Skipping short repetitive instruction: "${instructionText}" (${stepDistance}m)`);
        return; // Skips this instruction
      }
      
      // Skips short turn instructions that don't have street names 
      if (instructionText && !streetName && 
          (instructionText.includes('turn') || instructionText.includes('Turn')) &&
          stepDistance < 100) {
        console.log(`Skipping short turn instruction without street name: "${instructionText}"`);
        return;
      }
      
      // Add details to first instruction (start) with starting point name
      if (index === 0 && options.starting_point_name) {
        console.log(`Adding details to first instruction. Original: "${instructionText}", Starting point: "${options.starting_point_name}", Street name: "${streetName}"`);
        
        // Checks if this is a very short distance instruction or short turn without street name
        const isShortDistanceInstruction = stepDistance < 50 && instructionText && instructionText.toLowerCase().includes('turn');
        const isShortTurnWithoutStreet = stepDistance < 100 && !streetName && instructionText && instructionText.toLowerCase().includes('turn');
        
        if (isShortDistanceInstruction || isShortTurnWithoutStreet) {
          // For short instructions, just show starting point
          instructionText = `Start from ${options.starting_point_name}`;
        } else if (instructionText && instructionText.toLowerCase().includes('continue')) {
          if (streetName) {
            // If a street name is provided, use it in the instruction
            instructionText = `Start from ${options.starting_point_name} and continue on ${streetName}`;
          } else {
            // If no street name, just show starting point
            instructionText = `Start from ${options.starting_point_name}`;
          }
        } else if (streetName) {
          instructionText = `Start from ${options.starting_point_name} onto ${streetName}`;
        } else if (instructionText) {
          instructionText = `Start from ${options.starting_point_name}: ${instructionText}`;
        } else {
          instructionText = `Start from ${options.starting_point_name}`;
        }
        console.log(`Added details to first instruction: "${instructionText}"`);
      }
      
      // Adding details to destination instruction to include destination name
      if (instructionType === 10 && options.destination_name) {
        console.log(`Adding details to destination instruction. Original: "${instructionText}", Destination: "${options.destination_name}"`);
        instructionText = `Arrive at ${options.destination_name}`;
        console.log(`Added details to destination instruction: "${instructionText}"`);
      }

      instructions.push({
        instruction: instructionText || `Continue for ${stepDistance}`,
        distance: stepDistance,
        duration: stepDuration,
        duration_formatted: formatDuration(stepDuration),
        type: instructionType,
        modifier: null,
        street_name: streetName,
        sign: instruction.sign 
      });
    });
    
    // Only add destination instruction if GraphHopper didn't provide one
    if (!hasDestinationInstruction) {
      const destinationText = options.destination_name ? 
        `Arrive at ${options.destination_name}` : 
        'Arrive at your destination';
      
      instructions.push({
        instruction: destinationText,
        distance: '0 ft',
        distance_raw: 0,
        duration: 0,
        type: 10,
        modifier: null,
      });
    }
  } else {
    // If no GraphHopper instructions, add a basic destination instruction
    const destinationText = options.destination_name ? 
      `Arrive at ${options.destination_name}` : 
      'Arrive at your destination';
    
    instructions.push({
      instruction: destinationText,
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

  const elevationGain = null;

  // Determine unit system and calculate total_distance
  const unitSystem = options?.unit_system || 'km';
  let totalDistance, totalDistanceUnit;
  
  if (unitSystem === 'mi') {
    totalDistance = Math.round((distance / 1000) * 0.621371 * 100) / 100; // Convert km to miles, round to 2 decimal places
    totalDistanceUnit = 'mi';
  } else {
    totalDistance = Math.round((distance / 1000) * 100) / 100; // Convert to km, round to 2 decimal places
    totalDistanceUnit = 'km';
  }

  return {
    route: coordinates,
    total_length_km: distance / 1000,
    total_length_formatted: distance,
    total_distance: totalDistance,
    total_distance_unit: totalDistanceUnit,
    total_elevation_gain: elevationGain,
    total_ride_time: formatDuration(totalRideTimeSeconds),
    total_ride_time_minutes: totalRideTimeMinutes,
    instructions,
    data_source: 'graphhopper'
  };
}

module.exports = {
  getGraphHopperRoute,
  formatGraphHopperResponse
};
