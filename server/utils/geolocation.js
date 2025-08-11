const axios = require('axios');

// Gets user's location based on IP address using ipinfo.io
async function getLocationFromIP(ipAddress) {
  try {
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      console.log('Using default location for localhost');
      return {
        lat: 39.9526,
        lon: -75.1652,
        city: 'Philadelphia',
        region: 'Pennsylvania',
        country: 'US',
        place: 'Philadelphia, Pennsylvania, USA'
      };
    }

    const response = await axios.get(`http://ipinfo.io/${ipAddress}/json`, {
      timeout: 5000
    });

    const data = response.data;
    
    if (data.loc) {
      const [lat, lon] = data.loc.split(',').map(Number);
      return {
        lat,
        lon,
        city: data.city || 'Unknown',
        region: data.region || 'Unknown', 
        country: data.country || 'Unknown',
        place: `${data.city || 'Unknown'}, ${data.region || 'Unknown'}, ${data.country || 'Unknown'}`
      };
    }
    
    throw new Error('No location data found');
  } catch (error) {
    console.error('Error getting location from IP:', error.message);
    
    // Fallback to default location (Philadelphia)
    return {
      lat: 39.9526,
      lon: -75.1652,
      city: 'Philadelphia',
      region: 'Pennsylvania', 
      country: 'US',
      place: 'Philadelphia, Pennsylvania, USA'
    };
  }
}

// Gets the user's IP address from request headers
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
}

module.exports = {
  getLocationFromIP,
  getClientIP
};
