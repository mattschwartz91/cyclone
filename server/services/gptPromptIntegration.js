const axios = require('axios');
const { OPENAI_API_KEY, OPENAI_API_URL, OPENAI_MODEL } = require('../config/config');
const { calculateDistance } = require('../utils/calculationsUtils');

/**
 * Calculate distance requirements based on target distance
 */
function calculateDistanceRequirements(targetDistance, unitSystem) {
  // Makes sure unitSystem is valid, default to 'km' if not provided or invalid
  if (!unitSystem || (unitSystem !== 'mi' && unitSystem !== 'km')) {
    console.warn(`Invalid or missing unit system in calculateDistanceRequirements: ${unitSystem}, defaulting to 'km'`);
    unitSystem = 'km';
  }
  
  // Determine unit labels based on unit system from frontend (mi or km)
  const unitLabelPlural = unitSystem === 'mi' ? 'miles' : 'kilometers';
  const unitLabelSingular = unitSystem === 'mi' ? 'mile' : 'kilometer';
  
  // Distance category thresholds for guidance (adjusted based on unit system from frontend)
  const distanceCategories = unitSystem === 'mi' ? {
    short: { min: 0, max: 3, waypoints: { min: 4, max: 5 }, spacing: `0.3-0.6 ${unitLabelPlural} apart` },
    medium: { min: 3, max: 8, waypoints: { min: 5, max: 9 }, spacing: `0.6-1.2 ${unitLabelPlural} apart` },
    long: { min: 8, max: 15, waypoints: { min: 7, max: 10 }, spacing: `1.2-1.9 ${unitLabelPlural} apart` },
    extraLong: { min: 15, max: 1000, waypoints: { min: 9, max: 14 }, spacing: `1.9-3.1 ${unitLabelPlural} apart` }
  } : {
    short: { min: 0, max: 5, waypoints: { min: 4, max: 5 }, spacing: `0.5-1 ${unitLabelPlural} apart` },
    medium: { min: 5, max: 13, waypoints: { min: 5, max: 9 }, spacing: `1-2 ${unitLabelPlural} apart` },
    long: { min: 13, max: 24, waypoints: { min: 7, max: 10 }, spacing: `2-3 ${unitLabelPlural} apart` },
    extraLong: { min: 24, max: 1000, waypoints: { min: 9, max: 14 }, spacing: `3-5 ${unitLabelPlural} apart` }
  };
  
  let category;
  for (const [catName, catData] of Object.entries(distanceCategories)) {
    if (targetDistance >= catData.min && targetDistance < catData.max) {
      category = catData;
      break;
    }
  }
  
  if (!category) {
    category = distanceCategories.extraLong;
  }
  
  // Generate distance guidance text
  let distanceGuidance;
  const shortThreshold = unitSystem === 'mi' ? 1 : 8;
  const mediumThreshold = unitSystem === 'mi' ? 10 : 16;
  
  if (targetDistance < shortThreshold) {
    distanceGuidance = `For shorter routes like this ${targetDistance}-${unitLabelSingular} ride, waypoints should be closer together to ensure you hit the target distance. Consider local loops, neighborhood circuits, or nearby park connections.`;
  } else if (targetDistance < mediumThreshold) {
    distanceGuidance = `For longer routes like this ${targetDistance}-${unitLabelSingular} ride, balance interesting destinations with practical routing. Use as many waypoints needed to help reach the target distance. Be sure to include notable areas or landmarks.`;
  } else {
    distanceGuidance = `This is a long ${targetDistance}-${unitLabelSingular} route. Push waypoints well away from the start — spread them across a wide area so the road distance between them adds up to the target. Avoid clustering waypoints near the origin.`;
  }
  
  return {
    minWaypoints: category.waypoints.min,
    maxWaypoints: category.waypoints.max,
    waypointSpacing: category.spacing,
    distanceGuidance,
    targetDistance: targetDistance,
    unitSystem: unitSystem
  };
}

/**
 * Generate GPT prompt for route planning
 */
function generateGPTPrompt(start, end, options) {
  const {
    route_type,
    target_distance, 
    use_bike_lanes=true, 
    avoid_traffic, 
    avoid_hills, 
    elevation_focus, 
    starting_point_name,
    destination_name,
    custom_description,
    unit_system 
  } = options;
  
  // Validate that required parameters (target distance and unit system) are provided
  if (!target_distance || target_distance <= 0) {
    throw new Error('Target distance must be provided and greater than 0');
  }
  
  // Ensure unit_system is valid, default to 'km' if not provided or invalid
  let validUnitSystem = unit_system;
  if (!validUnitSystem || (validUnitSystem !== 'mi' && validUnitSystem !== 'km')) {
    console.warn(`Invalid or missing unit_system: ${validUnitSystem}, defaulting to 'km'`);
    validUnitSystem = 'km';
  }
  
  // Calculate distance requirements based on target distance and unit system
  const distanceReqs = calculateDistanceRequirements(target_distance, validUnitSystem);
  
  // Build starting and ending location descriptions
  const startLocation = starting_point_name || `coordinates ${start.lat}, ${start.lon}`;
  const endLocation = end && destination_name ? 
    destination_name : 
    end ? `coordinates ${end.lat}, ${end.lon}` : startLocation;
  
  // Advanced options toggle description
  let advancedOptionsToggle = [];
  if (use_bike_lanes) advancedOptionsToggle.push('prioritizing bike lanes');
  if (avoid_traffic) advancedOptionsToggle.push('avoiding high traffic areas');
  if (avoid_hills) advancedOptionsToggle.push('avoiding hills');
  if (elevation_focus) advancedOptionsToggle.push('with elevation focus');
  
  const toggleOptions = advancedOptionsToggle.length > 0 ? 
    `focused on ${advancedOptionsToggle.join(' and ')}` : 
    'I don\'t have specific preferences for bike lanes, traffic, elevation, or hills';
  
  // Route type description
  let routeTypeDescription;
  switch (route_type) {
    case 'scenic':
      routeTypeDescription = 'focused on scenic routes with paved roads and beautiful views';
      break;
    case 'offroad':
      routeTypeDescription = 'focused on off-road trails with unpaved nature paths and green spaces';
      break;
    case 'training':
      routeTypeDescription = 'focused on training routes with challenging elevation for fitness enthusiasts';
      break;
    case 'city':
      routeTypeDescription = 'focused on exploring city streets, urban attractions, new neighborhoods, local culture, and hidden gems';
      break;
    default:
      routeTypeDescription = 'focused on scenic routes with paved roads and beautiful views';
  }
  
  // Add custom description if provided and route type is custom
  if (route_type === 'custom') {
    if (custom_description && custom_description.trim()) {
      routeTypeDescription = custom_description.trim();
    } else {
      routeTypeDescription = 'customized according to your target distance preferences';
    }
  } else if (custom_description && custom_description.trim()) {
    routeTypeDescription += `. Additionally, ${custom_description.trim()}`;
  }
  
  // Determine unit labels for prompts (using frontend values mi or km)
  const unitLabelSingular = validUnitSystem === 'mi' ? 'mile' : 'kilometer';
  const unitLabelPlural = validUnitSystem === 'mi' ? 'miles' : 'kilometers';
  

  // Future reference - original scenic route guidance (commented out)

  const systemPrompt = `You are a cycling route planning expert. Generate a bicycle route with specific waypoints that can be used to create turn-by-turn directions.

IMPORTANT: You must respond with a JSON object containing:
1. "waypoints": An array of coordinate objects with "lat" and "lon" properties
2. "difficulty": A string rating ("Easy", "Moderate", "Challenging", "Expert")
3. "description": A breakdown of the route highlights (key waypoints/names of notable landmarks/points of interest) to look out for
4. "route_name": A creative, descriptive name for this route (e.g., "Riverside Scenic Loop", "Mountain Training Challenge", "Downtown Urban Explorer")


CRITICAL REQUIREMENTS FOR ${target_distance} ${unitLabelSingular.toUpperCase()} ROUTES:
- The first waypoint MUST be the exact starting location provided: ${start.lat}, ${start.lon}
- The last waypoint MUST be the exact ending location provided: ${end ? `${end.lat}, ${end.lon}` : `${start.lat}, ${start.lon}`}
- Use between ${distanceReqs.minWaypoints} and ${distanceReqs.maxWaypoints} intermediate waypoints, with each consecutive pair spaced roughly ${distanceReqs.waypointSpacing}.
- Each waypoint should be a notable or popular landmark, destination, or area worth visiting on a bike tour around town.
- The primary goal is to ensure the user reaches their target distance of ${target_distance} ${unitLabelSingular}.
- Be as accurate as possible with the waypoints to ensure the route is close to this ${target_distance} ${unitLabelSingular}.
- At the same time, tailor the chosen waypoints to match the user's preferences ${route_type}, so that the route not only achieves the distance goal but also reflects the user's interests and enhances their overall experience.
- For loop routes (same start/end), spread waypoints evenly around a circle — think of them as clock positions (12, 3, 6, 9 o'clock) to avoid out-and-back paths that overlap.
- Consider the route type when placing intermediate waypoints (scenic = paved roads with views, city = urban neighborhoods, etc.)`;

  const userPrompt = `Generate me a bike route ${toggleOptions}. I want to get from ${startLocation} to ${endLocation}. The total distance of the route should be as close to ${target_distance} ${unitLabelPlural} as possible. I want my bike ride to be ${routeTypeDescription}.

DISTANCE REQUIREMENTS: This is a ${target_distance} ${unitLabelSingular} route request. ${distanceReqs.distanceGuidance}

WAYPOINT SPECIFICATIONS:
- Start at: ${start.lat}, ${start.lon} (EXACT coordinates required)
- End at: ${end ? `${end.lat}, ${end.lon}` : `${start.lat}, ${start.lon}`} (EXACT coordinates required)
- Use ${distanceReqs.minWaypoints}–${distanceReqs.maxWaypoints} intermediate waypoints, each pair spaced ${distanceReqs.waypointSpacing}
- Each waypoint should align with the ${route_type} route type${route_type === 'custom' && custom_description && custom_description.trim() ? ` and incorporate the custom preferences: "${custom_description.trim()}"` : ''}

CRITICAL:
- Your goal is to minimize the error between the actual route distance and the ${target_distance} in ${unitLabelSingular}.
- If multiple candidate routes are possible, select the one with the smallest deviation.
- You may apply statistical approaches (such as evaluating standard deviation of distance options) to optimize accuracy.${!end ? `\n\nLOOP ROUTE GEOMETRY: This is a loop route returning to the start. Place intermediate waypoints at evenly distributed compass bearings (e.g., north, east, south, west — like clock positions 12, 3, 6, 9) so the route forms a genuine loop rather than an out-and-back path. Each waypoint must be at least ${distanceReqs.waypointSpacing} from its neighbors measured in a straight line.` : ''}${options._distanceHint ? `\n\nPREVIOUS ATTEMPT FEEDBACK: ${options._distanceHint}` : ''}`

  return { systemPrompt, userPrompt };
}

/**
 * Call OpenAI API with prompts
 */
async function callOpenAI(prompts) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await axios.post(OPENAI_API_URL, {
      model: OPENAI_MODEL, 
      messages: [
        {
          role: 'system',
          content: prompts.systemPrompt
        },
        {
          role: 'user',
          content: prompts.userPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API call failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Parse waypoints from GPT response
 */
function parseWaypointsFromGPT(gptResponse, start, end, routingAPI = 'valhalla') {
  try {
    console.log('Raw GPT response:', gptResponse.substring(0, 200) + '...');
    
    // Try to parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(gptResponse);
    } catch (parseError) {
      console.log('Direct JSON parsing failed, trying to extract and clean JSON from response');
      // If direct JSON parsing fails, try to extract JSON from the response
      // Handle cases where GPT might include explanatory text before/after JSON
      let jsonMatch = gptResponse.match(/\{[\s\S]*?\}(?=\s*$|\s*```|\s*\n\n)/);
      if (jsonMatch) {
        console.log('Found JSON match:', jsonMatch[0].substring(0, 100) + '...');
        // Clean the JSON by removing JavaScript-style comments
        let cleanedJson = jsonMatch[0]
          .replace(/\/\/.*$/gm, '')  // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
          .replace(/,\s*}/g, '}')  // Remove trailing commas before }
          .replace(/,\s*]/g, ']');  // Remove trailing commas before ]
        
        console.log('Cleaned JSON:', cleanedJson.substring(0, 200) + '...');
        parsedResponse = JSON.parse(cleanedJson);
      } else {
        // Try another pattern for JSON extraction
        const alternateMatch = gptResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (alternateMatch) {
          console.log('Found JSON in code block:', alternateMatch[1].substring(0, 100) + '...');
          // Clean the JSON by removing comments
          let cleanedJson = alternateMatch[1]
            .replace(/\/\/.*$/gm, '')  // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
            .replace(/,\s*}/g, '}')  // Remove trailing commas before }
            .replace(/,\s*]/g, ']');  // Remove trailing commas before ]
          
          parsedResponse = JSON.parse(cleanedJson);
        } else {
          throw new Error('No valid JSON found in GPT response');
        }
      }
    }
    
    if (!parsedResponse.waypoints || !Array.isArray(parsedResponse.waypoints)) {
      throw new Error('Invalid waypoints format in GPT response');
    }
    
    // Validate waypoints
    const gptWaypoints = parsedResponse.waypoints.filter(wp => 
      wp.lat && wp.lon && 
      typeof wp.lat === 'number' && 
      typeof wp.lon === 'number'
    );
    
    if (gptWaypoints.length < 2) {
      throw new Error('Not enough valid waypoints in GPT response');
    }
    
    // Log what GPT provided
    console.log('GPT provided waypoints:', gptWaypoints);
    console.log('Routing API:', routingAPI);
    
    // Ensure start and end points are preserved
    const preservedWaypoints = [];
    
    // Always start with the original start point
    preservedWaypoints.push({ lat: start.lat, lon: start.lon });
    
    // Handle intermediate waypoints based on routing API
    if (routingAPI === 'graphhopper') {
      // For GraphHopper: Limit to 5 waypoints total (start + 3 intermediate + end)
      // Let GPT decide which intermediate waypoints are most important
      const intermediateWaypoints = gptWaypoints.slice(1, -1);
      if (intermediateWaypoints.length > 3) {
        console.log(`GraphHopper limit: Using first 3 of ${intermediateWaypoints.length} intermediate waypoints from GPT`);
        preservedWaypoints.push(...intermediateWaypoints.slice(0, 3));
      } else {
        preservedWaypoints.push(...intermediateWaypoints);
      }
    } else {
      // For Valhalla: Use all intermediate waypoints
      const intermediateWaypoints = gptWaypoints.slice(1, -1);
      preservedWaypoints.push(...intermediateWaypoints);
    }
    
    // Always end with the original end point (or start point for loops)
    const endPoint = end ? { lat: end.lat, lon: end.lon } : { lat: start.lat, lon: start.lon };
    preservedWaypoints.push(endPoint);
    
    // Calculate estimated straight-line distance between waypoints for debugging
    let estimatedDistance = 0;
    for (let i = 0; i < preservedWaypoints.length - 1; i++) {
      const distance = calculateDistance(preservedWaypoints[i], preservedWaypoints[i + 1]);
      estimatedDistance += distance;
    }
    const estimatedKM = estimatedDistance / 1000;
    
    console.log(`Straight-line distance between waypoints: ${estimatedKM.toFixed(2)} km (${estimatedKM.toFixed(2)} kilometers) - for debugging only`);
    console.log(`Note: Actual route distance will be longer as it follows roads and paths`);
    console.log(`GPT generated route description: ${parsedResponse.description || 'No description provided'}`);
    console.log(`GPT suggested difficulty: ${parsedResponse.difficulty || 'Not specified'}`);
    
    return {
      waypoints: preservedWaypoints,
      gptDescription: parsedResponse.description || 'No description provided',
      gptDifficulty: parsedResponse.difficulty || 'Not specified',
      gptRouteName: parsedResponse.route_name || 'No route name provided'
    };
  } catch (error) {
    console.error('Error parsing GPT response:', error);
    // Fallback: return start and end points only
    return {
      waypoints: [
        { lat: start.lat, lon: start.lon },
        end ? { lat: end.lat, lon: end.lon } : { lat: start.lat, lon: start.lon }
      ],
      gptDescription: 'Fallback route due to GPT parsing error',
      gptDifficulty: 'Not specified',
      gptRouteName: 'Fallback route'
    };
  }
}

/**
 * Generate route using GPT for waypoints
 */
async function generateGPTRoute(start, end, options) {
  try {
    console.log('Generating GPT-based route...');
    console.log('Start:', start);
    console.log('End:', end);
    console.log('Options:', options);
    
    // Generate prompts for GPT
    const prompts = generateGPTPrompt(start, end, options);
    console.log('System prompt length:', prompts.systemPrompt.length);
    console.log('User prompt length:', prompts.userPrompt.length);
    
    // Call GPT API
    const gptResponse = await callOpenAI(prompts);
    console.log('GPT response received, length:', gptResponse.length);
    
    // Parse waypoints from GPT response
    const gptResult = parseWaypointsFromGPT(gptResponse, start, end, 'valhalla');
    console.log('Parsed waypoints:', gptResult.waypoints.length);
    
    return {
      waypoints: gptResult.waypoints,
      gptResponse: gptResponse,
      gptDescription: gptResult.gptDescription,
      gptDifficulty: gptResult.gptDifficulty,
      gptRouteName: gptResult.gptRouteName
    };
  } catch (error) {
    console.error('GPT route generation failed:', error);
    throw error;
  }
}

module.exports = {
  generateGPTRoute,
  generateGPTPrompt,
  callOpenAI,
  parseWaypointsFromGPT,
  calculateDistanceRequirements
};
