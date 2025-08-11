// calls the route generation backend
import locationService from './locationService.js';

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
    end_lat: parseFloat(preferences.endLat) || null,
    end_lon: parseFloat(preferences.endLon) || null,
    avoid_hills: preferences.avoidHills || false,
    include_elevation: preferences.includeElevation || false,
    use_bike_lanes: preferences.bikeLanes !== false, // Default to true
    target_distance: parseFloat(preferences.distanceTarget) || 5.0,
    unit_system: preferences.unitSystem || "imperial",
    route_type: preferences.routeType || "scenic",
    avoid_traffic: preferences.avoidHighTraffic || false,
    points_of_interest: preferences.pointsOfInterest || false,
    prefer_greenways: preferences.preferGreenways || false,
    include_scenic: preferences.includeScenic || false,
    user_location: userLocation  // Include user location for OSM graph selection
  };

  console.log('Sending preferences to backend:', backendPreferences);

  const response = await fetch('http://localhost:8000/api/generate-custom-route', {
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