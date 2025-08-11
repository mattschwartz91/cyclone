class LocationService {
  constructor() {
    this.baseURL = 'http://localhost:8000/api';
    this.userLocation = null;
  }

  /**
   * Gets the user's location based on IP address
   * @returns {Promise<Object>} Location data with lat, lon, city, region, country
   */
  async getUserLocation() {
    try {
      if (this.userLocation) {
        return this.userLocation;
      }

      const response = await fetch(`${this.baseURL}/location`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.userLocation = data.location;
          console.log(`User location detected: ${this.userLocation.city}, ${this.userLocation.region}`);
          return this.userLocation;
        } else {
          throw new Error('Failed to get location from server');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
      
      // If there's an error with fetcing the user's location, then Philadelphia is used as a fallback
      this.userLocation = {
        lat: 39.9526,
        lon: -75.1652,
        city: 'Philadelphia',
        region: 'Pennsylvania',
        country: 'US',
        place: 'Philadelphia, Pennsylvania, USA'
      };
      
      return this.userLocation;
    }
  }

    // Get elevation data for route coordinates
  async getElevationData(coordinates) {
    try {
      // Uses Open Elevation's API to get elevation data
      const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: coordinates.map(coord => ({
            latitude: coord.lat,
            longitude: coord.lon
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.results) {
          return coordinates.map((coord, index) => ({
            ...coord,
            elevation: data.results[index]?.elevation || 0
          }));
        } else {
          throw new Error('No elevation data received');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error getting elevation data:', error);
      
      // Return coordinates without elevation data
      return coordinates.map(coord => ({
        ...coord,
        elevation: null
      }));
    }
  }

    // Calculate elevation gain from route coordinates with elevation data
  calculateElevationGain(routeWithElevation) {
    let totalGain = 0;
    
    for (let i = 1; i < routeWithElevation.length; i++) {
      const prevElevation = routeWithElevation[i - 1].elevation;
      const currElevation = routeWithElevation[i].elevation;
      
      if (prevElevation !== null && currElevation !== null) {
        const gain = currElevation - prevElevation;
        if (gain > 0) {
          totalGain += gain;
        }
      }
    }
    
    return totalGain;
  }
  clearLocation() {
    this.userLocation = null;
  }
}

export default new LocationService();
