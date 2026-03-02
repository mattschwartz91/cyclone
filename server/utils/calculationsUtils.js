/**
 * Combines utilities for calculations including geography and route difficulty
 */

/**
 * Calculates distance between two geographical points using Haversine formula
 */
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

/**
 * Calculates route difficulty based on distance, elevation, and options
 */
function calculateRouteDifficulty(routeData, options) {
  const {
    total_length_km,
    total_elevation_gain,
    total_ride_time_minutes
  } = routeData;
  
  let difficultyScore = 0;
  
  // Distance factor (0-30 points)
  if (total_length_km < 5) difficultyScore += 5;
  else if (total_length_km < 10) difficultyScore += 10;
  else if (total_length_km < 20) difficultyScore += 20;
  else difficultyScore += 30;
  
  // Elevation factor (0-40 points)
  const elevationPerKm = total_elevation_gain / total_length_km;
  if (elevationPerKm < 10) difficultyScore += 5;
  else if (elevationPerKm < 20) difficultyScore += 15;
  else if (elevationPerKm < 40) difficultyScore += 25;
  else difficultyScore += 40;
  
  // Route type factor (0-20 points)
  switch (options.route_type) {
    case 'training':
      difficultyScore += 20;
      break;
    case 'city':
      difficultyScore += 15;
      break;
    case 'scenic':
      difficultyScore += 10;
      break;
    case 'custom':
    default:
      difficultyScore += 5;
      break;
  }

  // case 'scenic':
  //   difficultyScore += 5;
  //   break;
  
  // Advanced options factor (0-10 points)
  if (options.avoid_hills) difficultyScore -= 5;
  if (options.use_bike_lanes) difficultyScore -= 2;
  if (options.avoid_traffic) difficultyScore -= 2;
  if (options.elevation_focus) difficultyScore += 10;
  
  // Determine difficulty level
  if (difficultyScore < 20) return 'Easy';
  else if (difficultyScore < 40) return 'Moderate';
  else if (difficultyScore < 60) return 'Challenging';
  else return 'Expert';
}

module.exports = {
  calculateDistance,
  calculateRouteDifficulty
};
