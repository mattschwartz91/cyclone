// calls the route generation backend
import locationService from './locationService.js';
import { distLabel } from './units.js'; // Import distLabel to get unit system
import { API_BASE_URL } from './apiBase.js';

export async function generateRoute(preferences) {
  // Check multiple sources for starting location coordinates
  const startLat = preferences.startLat || 
                   preferences.location?.lat || 
                   preferences.startingPointCoords?.lat;
  const startLon = preferences.startLon || 
                   preferences.location?.lng || 
                   preferences.startingPointCoords?.lng;
  
  if (!startLat || !startLon) {
    throw new Error("LOCATION_REQUIRED");
  }

  // Get user's location for OSM graph selection
  let userLocation = null;
  try {
    userLocation = await locationService.getUserLocation();
    console.log('Using user location for route generation:', userLocation.place);
  } catch (error) {
    console.warn('Could not get user location for OSM graph:', error);
  }

  // Maps frontend field names to backend field names
  const backendPreferences = {
    start_lat: parseFloat(startLat),
    start_lon: parseFloat(startLon),
    end_lat: parseFloat(preferences.endLat) || 
             parseFloat(preferences.endingPointCoords?.lat) || null,
    end_lon: parseFloat(preferences.endLon) || 
             parseFloat(preferences.endingPointCoords?.lng) || null,
    destination_name: preferences.endingPoint || null,
    starting_point_name: preferences.startingPoint || null,
    avoid_hills: preferences.avoidHills || false,
    include_elevation: preferences.includeElevation || false,
    elevation_focus: preferences.elevationFocus || false, 
    use_bike_lanes: preferences.bikeLanes !== false, 
    // Convert distance to match the unit system being sent to backend
    target_distance: (function() {
      const d = parseFloat(preferences.distanceTarget);
      if (!Number.isFinite(d)) return 5.0;
      
      const unitSystem = preferences.unitSystem || "km";
      let convertedDistance;
      if (unitSystem === "mi") {
        // Convert km to miles for backend
        convertedDistance = d / 1.60934; // distanceTarget is stored in km, convert to miles
        console.log(`Converting distance: ${d} km → ${convertedDistance.toFixed(2)} mi`);
      } else {
        // Keep as km
        convertedDistance = d;
        console.log(`Keeping distance: ${d} km`);
      }
      return convertedDistance;
    })(),
    unit_system: preferences.unitSystem || "km", 
    route_type: preferences.routeType || "scenic",
    custom_description: preferences.customDescription || null,
    avoid_traffic: preferences.avoidHighTraffic || false,
    points_of_interest: preferences.pointsOfInterest || false,
    prefer_greenways: preferences.preferGreenways || false,
    include_scenic: preferences.includeScenic || false,
    user_location: userLocation  // Include user location for OSM graph selection
  };

  console.log('Sending preferences to backend:', backendPreferences);

  const base = API_BASE_URL || '';
  const response = await fetch(`${base}/api/generate-custom-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPreferences)
  });
  
  if (!response.ok) {
    if (response.status === 422) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend validation error:', errorData);
      throw new Error("INVALID_COORDINATES");
    } else if (response.status >= 500) {
      throw new Error("SERVER_ERROR");
    } else {
      throw new Error("NETWORK_ERROR");
    }
  }
  
  const routeData = await response.json();
  
  // Get real elevation data if requested and route contains coordinates
  if (preferences.includeElevation && routeData.route && routeData.route.length > 0) {
    try {
      console.log('Fetching real elevation data for route...');
      const routeWithElevation = await locationService.getElevationData(routeData.route);
      const realElevationGain = locationService.calculateElevationGain(routeWithElevation);
      
      // Update route data with real elevation
      routeData.route = routeWithElevation;
      routeData.total_elevation_gain = realElevationGain;
      routeData.elevation_source = 'real_api';
      
      console.log(`Real elevation gain calculated: ${realElevationGain.toFixed(1)}m`);
    } catch (error) {
      console.warn('Failed to get real elevation data, using estimated:', error);
      routeData.elevation_source = 'estimated';
    }
  }
  
  return routeData;
}

/**
 * Reroute using user-modified waypoints directly (bypasses GPT).
 * Called when the user drags a waypoint on the map.
 * @param {Array<{lat: number, lon: number}>} waypoints - The updated waypoints
 * @param {Object} preferences - Route preferences (bike lanes, avoid hills, etc.)
 * @returns {Promise<Object>} The new route data
 */
export async function rerouteWithWaypoints(waypoints, preferences = {}) {
  console.log('=== rerouteWithWaypoints START ===');
  console.log('Waypoints received:', JSON.stringify(waypoints));
  console.log('Preferences received:', JSON.stringify(preferences));

  if (!waypoints || waypoints.length < 2) {
    console.error('Invalid waypoints - too few:', waypoints);
    throw new Error('At least 2 waypoints are required for rerouting');
  }

  const base = API_BASE_URL || '';
  const requestBody = {
    waypoints,
    preferences: {
      use_bike_lanes: preferences.bikeLanes !== false,
      avoid_hills: preferences.avoidHills || false,
      avoid_traffic: preferences.avoidHighTraffic || false,
      unit_system: preferences.unitSystem || 'km',
      route_type: preferences.routeType || 'scenic'
    }
  };

  const url = `${base}/api/reroute-with-waypoints`;
  console.log('API URL:', url);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  console.log('Response status:', response.status);
  console.log('Response ok?', response.ok);

  if (!response.ok) {
    let errorBody = null;
    try {
      const errorText = await response.text();
      console.error('Response error body:', errorText);
      errorBody = JSON.parse(errorText);
    } catch (parseErr) {
      console.error('Could not parse error response body');
    }

    if (response.status === 422) {
      throw new Error('INVALID_WAYPOINTS');
    } else if (response.status >= 500) {
      // Forward specific error type from backend if available
      const errorType = errorBody?.error_type;
      if (errorType === 'TIMEOUT') {
        throw new Error('TIMEOUT');
      } else if (errorType === 'NO_ROUTE') {
        throw new Error('No valid route');
      } else if (errorType === 'INVALID_WAYPOINTS') {
        throw new Error('INVALID_WAYPOINTS');
      }
      throw new Error('REROUTE_SERVER_ERROR');
    } else {
      throw new Error('REROUTE_NETWORK_ERROR');
    }
  }

  const data = await response.json();
  console.log('=== rerouteWithWaypoints SUCCESS ===');
  console.log('Response data keys:', Object.keys(data));
  return data;
}

/**
 * Saves a route to the user's profile
 * @param {Object} routeData - The route data to save
 * @param {string} routeData.routeName - Name of the route
 * @param {Array} routeData.waypoints - Array of route coordinates
 * @param {Object} routeData.rawStats - Route statistics
 * @param {Array} routeData.cueSheet - Turn-by-turn instructions
 * @param {Object} routeData.preferences - Route generation preferences
 * @returns {Promise<Object>} The saved route data
 */
export async function saveRoute(routeData) {
  const base = API_BASE_URL || '';
  const response = await fetch(`${base}/api/routes/plan/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(routeData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save route');
  }

  return response.json();
}

/**
 * Fetches the user's saved routes
 * @returns {Promise<Array>} Array of saved routes
 */
export async function getSavedRoutes() {
  const base = API_BASE_URL || '';
  const response = await fetch(`${base}/api/routes`, {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch saved routes');
  }

  return response.json();
}

/**
 * This method takes a route array, which contains rows of json files of 
 * lat: and lon: and converts it into a gpx file, user can then download this
 * @param {*} route 
 * @param {string} routeName
 * @returns 
 */
export async function generateGpxFile(route, routeName = null) {

  // check route is valid
  if (!route || !Array.isArray(route) || route.length === 0) {
    console.warn("Invalid route data for GPX export:", route);
    return;
  }
  
  // Generate filename based on route name or use default
  let filename = "route.gpx";
  if (routeName) {
    // Sanitize the route name for filename compatibility
    const sanitizedName = routeName
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^\w\s-]/g, '') // Remove special characters except underscores and hyphens
      .trim();
    
    if (sanitizedName.length > 0) {
      filename = `${sanitizedName}.gpx`;
    }
  }
  
  // parse json file for latitude and longitude
  const body = [];
  console.log("Processing route for GPX export:", route);
  
  for (let i = 0; i < route.length; i++) {
    const point = route[i];
    if (point && typeof point.lat === 'number' && typeof point.lon === 'number') {
      body.push(`<trkpt lat="${point.lat}" lon="${point.lon}"></trkpt>`);
    } else {
      console.warn(`Invalid coordinate at index ${i}:`, point);
    }
  }
  
  if (body.length === 0) {
    console.error("No valid coordinates found in route for GPX export");
    return;
  }
  
  console.log(`Generated ${body.length} track points for GPX export`);

  // build string
  const header = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" version="1.1" creator="gpx.py -- https://github.com/tkrajina/gpxpy">\n<trk>\n<trkseg>\n`;
  const footer = `\n</trkseg>\n</trk>\n</gpx>`;
  const gpx = header + body.join("\n") + footer;
  
  // make file
  const blob = new Blob([gpx], {type:"application/gpx+xml"});
  const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); // needed for Firefox
  a.click();
  document.body.removeChild(a);

  // release the Blob URL
  URL.revokeObjectURL(url);
}