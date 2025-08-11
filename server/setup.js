const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: '../.env' });

async function validateEnvironmentVariables() {
  const requiredVars = ['GRAPHHOPPER_API_KEY'];
  const missingVars = [];
  
  requiredVars.forEach((key) => {
    if (!process.env[key]) {
      missingVars.push(key);
      console.warn(`Warning: Environment variable ${key} is not set.`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`\nPlease add these to your .env file:\n${missingVars.join('\n')}`);
  }
}

async function validateApiKeys() {
  const graphhopperKey = process.env.GRAPHHOPPER_API_KEY;
  if (graphhopperKey) {
    try {
      const response = await axios.get(`https://graphhopper.com/api/1/info?key=${graphhopperKey}`, { timeout: 5000 });
      if (response.status === 200) {
        console.log('GraphHopper API key is valid.');
        return true;
      }
    } catch (error) {
      console.error('Invalid GraphHopper API key:', error.message);
      return false;
    }
  } else {
    console.warn('GraphHopper API key not provided - some features may be limited.');
    return false;
  }
}

function setupTempDirectories() {
  const tempDirs = [
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'temp/osm_graphs'),
    path.join(__dirname, 'temp/cache'),
    path.join(__dirname, 'temp/logs')
  ];
  
  tempDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${path.relative(__dirname, dir)}`);
    }
  });
}

function cleanTemporaryFiles() {
  const tempDirs = [
    path.join(__dirname, 'temp/osm_graphs'),
    path.join(__dirname, 'temp/cache'),
    path.join(__dirname, 'temp/logs')
  ];
  
  let filesRemoved = 0;
  
  tempDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        // Removes files older than 24 hours
        const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        if (ageInHours > 24) {
          fs.rmSync(filePath, { force: true, recursive: true });
          filesRemoved++;
        }
      });
    }
  });
  
  if (filesRemoved > 0) {
    console.log(`🧹 Cleaned up ${filesRemoved} temporary files older than 24 hours.`);
  } else {
    console.log('🧹 No temporary files to clean up.');
  }
}

async function testApiConnectivity() {
  const tests = [
    { name: 'GraphHopper API', url: 'https://graphhopper.com/api/1/info' },
    { name: 'Open Elevation API', url: 'https://api.open-elevation.com/api/v1/lookup?locations=40.7128,-74.0060' }
  ];
  
  for (const test of tests) {
    try {
      const response = await axios.get(test.url, { timeout: 5000 });
      if (response.status === 200) {
        console.log(`Successfully connected to ${test.name}.`);
      }
    } catch (error) {
      console.error(`Failed to connect to ${test.name}:`, error.message);
    }
  }
}

async function preloadUserLocationGraph() {
  try {
    // Get user's IP-based location
    const response = await axios.get('http://localhost:8000/api/location', { timeout: 5000 });
    
    if (response.data && response.data.success) {
      const userLocation = response.data.location;
      console.log(`\nDetected user location: ${userLocation.place}`);
      
      // Check if OSM graph exists for this location
      const OSMGraphManager = require('./utils/osmGraphManager');
      const graphManager = new OSMGraphManager();
      
      // Use lat/lon from the API response
      const lat = userLocation.lat;
      const lon = userLocation.lon;
      
      if (!graphManager.graphExists(lat, lon)) {
        console.log('OSM graph will be downloaded when you generate your first route.');
        console.log(`Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      } else {
        console.log('OSM graph already cached for your location.');
        const graphs = graphManager.getCachedGraphs();
        const totalSize = graphs.reduce((sum, graph) => sum + graph.size, 0);
        console.log(`Cached graphs: ${graphs.length}, Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
      }
    }
  } catch (error) {
    console.log('Could not detect user location - OSM graph will be downloaded as needed.');
    // Don't fail the setup if location detection fails
  }
}

async function main() {
  console.log('Starting setup and validation...\n');

  setupTempDirectories();
  await validateEnvironmentVariables();
  await validateApiKeys();
  cleanTemporaryFiles();
  await testApiConnectivity();
  await preloadUserLocationGraph();

  console.log('\nSetup and validation completed.');
}

main().catch((error) => {
  console.error('Setup failed:', error.message);
});