// server/routes/routes.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const dataPath = path.join(__dirname, '../data/routes.json');
const profilesPath = path.join(__dirname, '../data/profiles.json');
const axios = require('axios');

const ensureDataFile = async () => {
  const dir = path.dirname(dataPath);
  try {
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(dataPath);
    } catch {
      await fs.writeFile(dataPath, JSON.stringify([]));
    }
  } catch (err) {
    console.error('Error ensuring data file:', err);
    throw new Error('Failed to initialize routes file');
  }
};

const readProfiles = async () => {
  const raw = await fs.readFile(profilesPath, 'utf8');
  return JSON.parse(raw);
};

const writeProfiles = async (profiles) => {
  await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
};

function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    console.log('Authentication failed: Invalid user', { headers: req.headers });
    return res.status(401).json({ error: 'Please log in first' });
  }
  console.log('Authenticated user:', req.user);
  next();
}

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Login failed: Missing credentials', { body: req.body });
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const testUser = { id: 'user123', username: 'test', name: 'John Doe', address: '123 Main St, Philadelphia, PA' };
  if (username === 'test' && password === 'password') {
    console.log('Login successful:', testUser);
    return res.json({ user: testUser });
  }

  console.log('Login failed: Invalid credentials', { username });
  return res.status(401).json({ error: 'Invalid username or password' });
});

router.post('/api/plan/save', requireAuth, async (req, res) => {
  try {
    await ensureDataFile();

    const userId = req.user.id;
    const { routeName, waypoints, rawStats, cueSheet, preferences } = req.body;

    if (!routeName || !Array.isArray(waypoints)) {
      console.log('Save route failed: Missing or invalid routeName/waypoints', { body: req.body });
      return res.status(400).json({ error: 'Missing or invalid route name or waypoints' });
    }

    const newRoute = {
      id: Date.now(),
      userId,
      routeName,
      waypoints: waypoints || [],
      rawStats: rawStats || null,
      cueSheet: cueSheet || [],
      preferences: preferences || null,
      createdAt: new Date().toISOString(),
    };

    console.log('Saving route:', newRoute);

    let routes = [];
    try {
      const raw = await fs.readFile(dataPath, 'utf8');
      routes = JSON.parse(raw);
      if (!Array.isArray(routes)) {
        console.warn('routes.json corrupted, resetting to empty array');
        routes = [];
      }
    } catch (err) {
      console.warn('Error parsing routes.json, resetting to empty array:', err);
      routes = [];
    }

    routes.push(newRoute);
    await fs.writeFile(dataPath, JSON.stringify(routes, null, 2));
    console.log('Route saved successfully to routes.json:', newRoute);

    res.json({ message: 'Route saved successfully' });
  } catch (err) {
    console.error('Error saving route:', err);
    res.status(500).json({ error: `Failed to save route: ${err.message}` });
  }
});

router.get('/api/plan', requireAuth, async (req, res) => {
  try {
    await ensureDataFile();
    const raw = await fs.readFile(dataPath, 'utf8');
    const routes = JSON.parse(raw);
    const userRoutes = routes.filter(route => route.userId === req.user.id);
    console.log('Fetched routes for user:', { userId: req.user.id, count: userRoutes.length });
    res.json(userRoutes || []);
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

router.get('/api/user/profile', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const profiles = await readProfiles();
    const user = profiles.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Failed to read profile:', err);
    res.status(500).json({ error: 'Failed to read profile' });
  }
});

router.put('/api/user/profile', async (req, res) => {
  const { id, name, address } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing user id' });

  try {
    const profiles = await readProfiles();
    const index = profiles.findIndex((u) => u.id === id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });

    profiles[index] = { ...profiles[index], name, address };
    await writeProfiles(profiles);

    console.log('Updated profile for', id);
    res.json(profiles[index]);
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/api/user/stats', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  res.json({
    distanceKm: 180.5,
    elevationM: 2350
  });
});

router.get('/routes', (req, res) => {
  const userId = req.query.userId;
  const routesPath = path.join(__dirname, '../data/routes.json');

  try {
    const data = fs.readFileSync(routesPath, 'utf-8');
    const allRoutes = JSON.parse(data);
    const userRoutes = allRoutes.filter(route => route.userId === userId);
    res.json(userRoutes);
  } catch (error) {
    console.error('Error reading routes.json:', error);
    res.status(500).json({ error: 'Failed to load user routes' });
  }
});

router.get('/api/user/routes', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const routes = JSON.parse(raw);
    const userRoutes = routes.filter(route => route.userId === userId);
    res.json(userRoutes);
  } catch (error) {
    console.error('Error reading routes.json:', error);
    res.status(500).json({ error: 'Failed to load user routes' });
  }
});

router.post('/api/plan-route', requireAuth, async (req, res) => {
  const { start, end } = req.body;
  if (!Array.isArray(start) || !Array.isArray(end)) {
    return res.status(400).json({ error: 'Invalid start or end coordinates' });
  }

  const coordinates = `${start.join(',')};${end.join(',')}`;
  const url = `http://localhost:5000/route/v1/bicycle/${coordinates}?overview=full&geometries=geojson`;

  try {
    const response = await axios.get(url);
    const route = response.data.routes?.[0];
    if (!route) return res.status(404).json({ error: 'No route found' });

    res.json({
      geometry: route.geometry,
      distance: route.distance,
      duration: route.duration
    });
  } catch (err) {
    console.error('OSRM route error:', err.message);
    res.status(500).json({ error: 'Failed to fetch route from OSRM' });
  }
});

module.exports = router;