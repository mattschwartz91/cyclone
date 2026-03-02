const { generateGPTRoute, parseWaypointsFromGPT } = require('./gptPromptIntegration');
const { getValhallaRoute } = require('./valhallaRequest');
const { getGraphHopperRoute, formatGraphHopperResponse } = require('./graphHopperRequest');
const { callPythonBackend } = require('./pythonBackup');
const { calculateRouteDifficulty } = require('../utils/calculationsUtils');
const { ROUTING_APIS } = require('../config/config');
const axios = require('axios');

/**
 * Generate route with waypoints using primary routing API (Valhalla) and fallback (GraphHopper)
 */
async function generateRouteWithWaypoints(waypoints, options, gptResponse = null, start = null, end = null) {
  console.log('\n=== generateRouteWithWaypoints START ===');
  console.log('Waypoints count:', waypoints?.length);
  console.log('Has gptResponse?', !!gptResponse);
  console.log('Has start/end?', !!start, !!end);

  try {
    // Use Valhalla as primary routing API
    console.log('=== TRYING VALHALLA (primary) ===');
    const routeData = await getValhallaRoute(waypoints, options);
    console.log('=== VALHALLA SUCCEEDED ===');
    
    return routeData;
  } catch (error) {
    console.error('=== VALHALLA ROUTING FAILED ===');
    console.error('Valhalla error message:', error.message);
    console.error('Valhalla error code:', error.code);
    console.error('Falling back to GraphHopper...');
    
    // Fallback to GraphHopper if Valhalla fails
    if (!ROUTING_APIS.GRAPHHOPPER.key) {
      console.error('No GraphHopper API key available - cannot fallback');
      throw new Error('Both Valhalla and GraphHopper failed, and no GraphHopper API key available');
    }
    
    // Re-parse waypoints specifically for GraphHopper if we have the original GPT response
    let graphhopperWaypoints = waypoints;
    if (gptResponse && start && end) {
      console.log('Re-parsing waypoints for GraphHopper with 5-waypoint limit');
      const gptResult = parseWaypointsFromGPT(gptResponse, start, end, 'graphhopper');
      graphhopperWaypoints = gptResult.waypoints;
      console.log(`GraphHopper waypoints: ${graphhopperWaypoints.length} waypoints`);
    } else {
      console.log('No gptResponse for reroute - using original waypoints for GraphHopper');
      // GraphHopper has a 5-waypoint limit. If we have more, sample evenly-spaced ones
      // while always keeping start and end points.
      if (graphhopperWaypoints.length > 5) {
        console.log(`Sampling waypoints for GraphHopper: ${graphhopperWaypoints.length} -> 5`);
        const sampled = [graphhopperWaypoints[0]]; // Always keep start
        const step = (graphhopperWaypoints.length - 1) / 4; // 4 intervals for 5 points
        for (let i = 1; i < 4; i++) {
          sampled.push(graphhopperWaypoints[Math.round(step * i)]);
        }
        sampled.push(graphhopperWaypoints[graphhopperWaypoints.length - 1]); // Always keep end
        graphhopperWaypoints = sampled;
        console.log('Sampled GraphHopper waypoints:', JSON.stringify(graphhopperWaypoints));
      }
    }
    
    // Build GraphHopper URL with the waypoints
    const baseUrl = ROUTING_APIS.GRAPHHOPPER.url;
    let url = `${baseUrl}?vehicle=bike&key=${ROUTING_APIS.GRAPHHOPPER.key}&instructions=true&calc_points=true&type=json`;
    
    // Add each waypoint as a point parameter
    graphhopperWaypoints.forEach(waypoint => {
      url += `&point=${encodeURIComponent(`${waypoint.lat},${waypoint.lon}`)}`;
    });
    
    console.log('GraphHopper fallback URL:', url);
    console.log('Waypoints for GraphHopper:', JSON.stringify(graphhopperWaypoints));
    
    try {
      const response = await axios.get(url, { timeout: 15000 });
      
      console.log('GraphHopper response status:', response.status);
      console.log('GraphHopper paths count:', response.data.paths?.length);
      
      if (response.data.paths && response.data.paths.length > 0) {
        const route = response.data.paths[0];
        const routeData = formatGraphHopperResponse(route, options);
        routeData.data_source = 'graphhopper_gpt_fallback';
        console.log('=== GRAPHHOPPER FALLBACK SUCCEEDED ===');
        
        return routeData;
      }
      
      throw new Error('No valid route found with waypoints');
    } catch (ghError) {
      console.error('=== GRAPHHOPPER FALLBACK ALSO FAILED ===');
      console.error('GraphHopper error message:', ghError.message);
      console.error('GraphHopper error code:', ghError.code);
      console.error('GraphHopper response data:', ghError.response?.data);
      console.error('GraphHopper response status:', ghError.response?.status);
      throw ghError;
    }
  }
}

/**
 * Main route generation function
 */
async function generateRoute(userPreferences) {
  try {
    const { start, end, options: userOptions, userLocation } = userPreferences;
    
    // Extract route options with defaults
    const {
      route_type,
      target_distance, 
      use_bike_lanes, 
      avoid_traffic,
      avoid_hills, 
      starting_point_name,
      destination_name,
      custom_description,
      routing_backend = 'gpt_powered',
      unit_system
    } = userOptions || {};

    console.log('Route generation request:', {
      start,
      end,
      route_type,
      target_distance,
      routing_backend,
      unit_system
    });

    const options = {
      route_type,
      target_distance: parseFloat(target_distance),
      use_bike_lanes,
      avoid_traffic,
      avoid_hills,
      starting_point_name,
      destination_name,
      custom_description,
      routing_backend,
      unit_system
    };

    let routeData;
    let gptMetadata = {};

    // Handle different routing backends
    if (routing_backend === 'python_osm') {
      console.log('Using Python OSM backend...');
      try {
        routeData = await callPythonBackend(start, end, options);
        routeData.data_source = 'python_osm';
      } catch (error) {
        console.error('Python OSM backend failed, falling back to GPT-powered routing:', error.message);
        routing_backend = 'gpt_powered';
      }
    }

    if (routing_backend === 'gpt_powered' || !routeData) {
      console.log('Using GPT-powered routing...');
      
      try {
        const DISTANCE_TOLERANCE = 0.25;

        // Generate route using GPT for waypoints
        const gptResult = await generateGPTRoute(start, end, options);

        // Store GPT metadata
        gptMetadata = {
          gpt_description: gptResult.gptDescription,
          gpt_difficulty: gptResult.gptDifficulty,
          gpt_route_name: gptResult.gptRouteName,
          waypoints_count: gptResult.waypoints.length
        };

        // Generate actual route with GPT waypoints
        routeData = await generateRouteWithWaypoints(
          gptResult.waypoints,
          options,
          gptResult.gptResponse,
          start,
          end
        );

        if (!routeData.data_source) {
          routeData.data_source = 'valhalla_gpt';
        }

        // Validate distance; retry once with a hint if too far off
        const targetDist = parseFloat(options.target_distance);
        const actualDist = routeData.total_distance;
        if (targetDist > 0 && actualDist > 0) {
          const ratio = actualDist / targetDist;
          if (ratio < (1 - DISTANCE_TOLERANCE) || ratio > (1 + DISTANCE_TOLERANCE)) {
            console.log(`Distance off target: got ${actualDist}, wanted ${targetDist} (ratio ${ratio.toFixed(2)}). Retrying with hint.`);
            const direction = ratio < 1 ? 'too short' : 'too long';
            const retryOptions = {
              ...options,
              _distanceHint: `The previous attempt was ${direction} (${actualDist.toFixed(1)} ${routeData.total_distance_unit} vs target ${targetDist} ${options.unit_system}). Adjust waypoint spread so the routed distance is closer to ${targetDist} ${options.unit_system}.`
            };
            const retryResult = await generateGPTRoute(start, end, retryOptions);
            const retryRouteData = await generateRouteWithWaypoints(
              retryResult.waypoints,
              options,
              retryResult.gptResponse,
              start,
              end
            );
            if (!retryRouteData.data_source) {
              retryRouteData.data_source = 'valhalla_gpt_retry';
            }
            const retryRatio = retryRouteData.total_distance / targetDist;
            if (Math.abs(retryRatio - 1) < Math.abs(ratio - 1)) {
              routeData = retryRouteData;
              gptMetadata.waypoints_count = retryResult.waypoints.length;
              console.log(`Retry improved distance: ${retryRouteData.total_distance.toFixed(1)} ${retryRouteData.total_distance_unit}`);
            } else {
              console.log(`Retry did not improve distance; keeping original result.`);
            }
          }
        }
        
      } catch (error) {
        console.error('GPT-powered routing failed:', error.message);
        
        // Final fallback: direct routing without waypoints
        console.log('Falling back to direct routing without waypoints...');
        
        try {
          let fallbackWaypoints;
          
          if (end) {
            // Point-to-point route
            fallbackWaypoints = [start, end];
            routeData = await generateRouteWithWaypoints(fallbackWaypoints, options);
            routeData.data_source = 'direct_fallback';
            
            gptMetadata = {
              gpt_description: 'Direct route due to GPT failure',
              gpt_difficulty: 'Not specified',
              gpt_route_name: 'Direct Route',
              waypoints_count: fallbackWaypoints.length
            };
          } else {
            // For loop routes without GPT waypoints, we can't generate a meaningful route
            throw new Error('Loop route generation requires GPT waypoints');
          }
          
        } catch (fallbackError) {
          console.error('All routing methods failed:', fallbackError.message);
          throw new Error(`All routing methods failed: ${fallbackError.message}`);
        }
      }
    }

    // Add calculated difficulty
    routeData.calculated_difficulty = calculateRouteDifficulty(routeData, options);
    
    // Add GPT metadata to response
    if (Object.keys(gptMetadata).length > 0) {
      routeData.gpt_metadata = gptMetadata;
    }

    console.log('Route generation successful:', {
      distance: `${Number(routeData.total_length_km).toFixed(2)} km`,
      elevation: `${routeData.total_elevation_gain}m`,
      source: routeData.data_source,
      difficulty: routeData.calculated_difficulty
    });

    return routeData;

  } catch (error) {
    console.error('Route generation error:', error);
    throw error;
  }
}

/**
 * Route with user-provided waypoints directly (no GPT involved).
 * Used for rerouting after user drags a waypoint on the map.
 */
async function routeWaypointsOnly(waypoints, preferences = {}) {
  console.log('\n=== routeWaypointsOnly START ===');
  console.log('Received waypoints:', JSON.stringify(waypoints, null, 2));
  console.log('Received preferences:', JSON.stringify(preferences, null, 2));

  try {
    if (!waypoints || waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required for routing');
    }

    // Validate waypoints
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      if (typeof wp.lat !== 'number' || typeof wp.lon !== 'number' ||
          isNaN(wp.lat) || isNaN(wp.lon)) {
        throw new Error(`Invalid waypoint at index ${i}: lat=${wp.lat}, lon=${wp.lon}`);
      }
    }
    console.log('Waypoint validation passed');

    const options = {
      route_type: preferences.route_type || 'scenic',
      use_bike_lanes: preferences.use_bike_lanes || false,
      avoid_traffic: preferences.avoid_traffic || false,
      avoid_hills: preferences.avoid_hills || false,
      unit_system: preferences.unit_system || 'km'
    };

    console.log('Built options:', JSON.stringify(options, null, 2));
    console.log('=== CALLING generateRouteWithWaypoints ===');

    // Route using the same Valhalla/GraphHopper flow, but with no GPT response for fallback re-parsing
    const routeData = await generateRouteWithWaypoints(waypoints, options);

    console.log('=== generateRouteWithWaypoints SUCCESS ===');
    console.log('Route data source:', routeData.data_source);
    console.log('Route coordinates count:', routeData.route?.length);

    // Add calculated difficulty
    routeData.calculated_difficulty = calculateRouteDifficulty(routeData, options);

    if (!routeData.data_source) {
      routeData.data_source = 'valhalla_reroute';
    }

    return routeData;
  } catch (error) {
    console.error('=== routeWaypointsOnly FAILED ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Failed waypoints:', JSON.stringify(waypoints));
    console.error('Preferences:', JSON.stringify(preferences));
    console.error('Error stack:', error.stack);
    throw error;
  }
}

module.exports = {
  generateRoute,
  generateRouteWithWaypoints,
  routeWaypointsOnly
};
