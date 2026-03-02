const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
require('dotenv').config({ path: '../.env' });
const { DATA_DIR } = require('./config/config.js');

async function createEnvFileIfMissing() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    const envTemplate = `# GraphHopper API Key
GRAPHHOPPER_API_KEY=your_graphhopper_api_key_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# React App API Base URL
REACT_APP_API_BASE_URL=http://localhost:3000
`;
    fs.writeFileSync(envPath, envTemplate);
    console.log('Created .env file template. Please add your API keys.');
    return false;
  }
  return true;
}

async function validateEnvironmentVariables() {
  const requiredVars = ['GRAPHHOPPER_API_KEY', 'OPENAI_API_KEY'];
  const missingVars = [];
  
  requiredVars.forEach((key) => {
    if (!process.env[key] || process.env[key].includes('your_') || process.env[key].includes('_here')) {
      missingVars.push(key);
      console.warn(`⚠️  Environment variable ${key} is not properly set.`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log(`\n📝 Please update these in your .env file:\n${missingVars.map(v => `   ${v}=your_actual_key_here`).join('\n')}`);
    return false;
  }
  
  console.log('✅ All required environment variables are set.');
  return true;
}

async function validateApiKeys() {
  let allValid = true;
  
  // Test GraphHopper API
  const graphhopperKey = process.env.GRAPHHOPPER_API_KEY;
  if (graphhopperKey && !graphhopperKey.includes('your_')) {
    try {
      const response = await axios.get(`https://graphhopper.com/api/1/info?key=${graphhopperKey}`, { timeout: 10000 });
      if (response.status === 200) {
        console.log('✅ GraphHopper API key is valid.');
      }
    } catch (error) {
      console.error('❌ Invalid GraphHopper API key:', error.response?.data?.message || error.message);
      allValid = false;
    }
  } else {
    console.warn('⚠️  GraphHopper API key not provided - routing fallback may be limited.');
    allValid = false;
  }

  // Test OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && !openaiKey.includes('your_')) {
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${openaiKey}` },
        timeout: 10000
      });
      if (response.status === 200) {
        console.log('✅ OpenAI API key is valid.');
      }
    } catch (error) {
      console.error('❌ Invalid OpenAI API key:', error.response?.data?.error?.message || error.message);
      allValid = false;
    }
  } else {
    console.warn('⚠️  OpenAI API key not provided - GPT-powered routing will not work.');
    allValid = false;
  }
  
  return allValid;
}

function setupTempDirectories() {
  const tempDirs = [
    path.join(__dirname, 'temp'),
    path.join(__dirname, 'temp/osm_graphs'),
    path.join(__dirname, 'temp/cache'),
    path.join(__dirname, 'temp/logs'),
    path.join(__dirname, 'cache'),
    DATA_DIR
  ];
  
  tempDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${path.relative(__dirname, dir)}`);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`❌ Error creating directory ${dir}: ${err.message}`);
        }
      }
    }
  });
  
  // Create users database if it doesn't exist
  const dbPath = path.join(DATA_DIR, 'users.db');
  if (!fs.existsSync(dbPath)) {
    console.log('📊 Initializing user database...');
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    });
    
    db.close();
    console.log('✅ User database initialized.');
  }
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
  console.log('🌐 Testing API connectivity...');
  const tests = [
    { name: 'Valhalla Routing API', url: 'https://valhalla1.openstreetmap.de/status' },
    { name: 'Open Elevation API', url: 'https://api.open-elevation.com/api/v1/lookup?locations=40.7128,-74.0060' }
  ];
  
  for (const test of tests) {
    try {
      const response = await axios.get(test.url, { timeout: 10000 });
      if (response.status === 200) {
        console.log(`✅ Successfully connected to ${test.name}.`);
      }
    } catch (error) {
      console.error(`❌ Failed to connect to ${test.name}:`, error.message);
    }
  }
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check Node.js
  try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js found: ${nodeVersion}`);
  } catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js first.');
    console.log('Visit: https://nodejs.org/');
    process.exit(1);
  }
  
  // Check Python3
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const python = spawn('python3', ['--version'], { stdio: 'pipe' });
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Python3 found: ${output.trim()}`);
        resolve(true);
      } else {
        console.warn('⚠️  Python3 is not installed. Some features may not work.');
        console.log('Visit: https://www.python.org/downloads/');
        resolve(false);
      }
    });
  });
}

async function checkDependencies() {
  console.log('📦 Checking dependencies...');
  
  // Check if node_modules exist in server directory
  const serverNodeModules = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(serverNodeModules)) {
    console.log('⚠️  Server dependencies not installed. Please run: cd server && npm install');
    return false;
  }
  
  // Check if node_modules exist in client directory
  const clientNodeModules = path.join(__dirname, '../client/node_modules');
  if (!fs.existsSync(clientNodeModules)) {
    console.log('⚠️  Client dependencies not installed. Please run: cd client && npm install');
    return false;
  }
  
  console.log('✅ All dependencies are installed.');
  return true;
}

async function installPythonDependencies() {
  return new Promise((resolve) => {
    console.log('🐍 Installing Python dependencies...');
    const pip = spawn('pip3', ['install', '-r', 'requirements.txt'], {
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    let output = '';
    pip.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pip.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    pip.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python dependencies installed successfully.');
        resolve(true);
      } else {
        console.warn('⚠️  Python dependencies installation failed or incomplete.');
        console.log('You may need to run: pip3 install -r requirements.txt manually');
        resolve(false); // Don't fail the entire setup
      }
    });
  });
}

async function preloadUserLocationGraph() {
  try {
    // Get user's IP-based location (use env override if present)
    const backendBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
    const response = await axios.get(`${backendBase}/api/location`, { timeout: 5000 });
    
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
  console.log('🚀 CYCLONE PROJECT SETUP');
  console.log('='.repeat(60));
  console.log('Setting up complete development environment...\n');

  // Check prerequisites first
  const pythonAvailable = await checkPrerequisites();

  // Check if .env exists and create template if needed
  const envExists = await createEnvFileIfMissing();
  if (!envExists) {
    console.log('\n⚠️  Setup paused: Please update the .env file with your API keys and run setup again.');
    console.log('   Run: node server/setup.js');
    return;
  }

  // Check if dependencies are installed
  const depsInstalled = await checkDependencies();
  if (!depsInstalled) {
    console.log('\n⚠️  Please install dependencies first:');
    console.log('   cd server && npm install');
    console.log('   cd client && npm install');
    console.log('\nThen run setup again: node server/setup.js');
    return;
  }

  // Install Python dependencies if available
  let pythonWorking = false;
  if (pythonAvailable) {
    pythonWorking = await installPythonDependencies();
  }

  // Setup directories and validate configuration
  setupTempDirectories();
  const envValid = await validateEnvironmentVariables();
  const apiKeysValid = await validateApiKeys();
  cleanTemporaryFiles();
  await testApiConnectivity();
  
  // Only run server-dependent tests if APIs are working
  if (envValid && apiKeysValid) {
    await preloadUserLocationGraph();
  }

  // Show completion message
  console.log('\n' + '='.repeat(60));
  console.log('🎉 CYCLONE SETUP COMPLETE!');
  console.log('='.repeat(60));
  
  if (envValid && apiKeysValid) {
    console.log('✅ All systems ready! You can now:');
    console.log('');
    console.log('   Start development (in separate terminal windows):');
    console.log('   Terminal 1: cd server && npm start');
    console.log('   Terminal 2: cd client && npm run dev');
    console.log('');
    console.log('   Or use the start script:');
    console.log('   ./start-dev.sh');
  } else {
    console.log('⚠️  Setup completed with warnings:');
    if (!envValid) {
      console.log('   • Update API keys in .env file');
    }
    if (!apiKeysValid) {
      console.log('   • Some features may not work without valid API keys');
    }
  }
  
  if (!pythonWorking) {
    console.log('   • Install Python dependencies manually if needed');
  }
  
  console.log('');
  console.log('📚 Documentation: requirements.md');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Setup failed:', error.message);
});