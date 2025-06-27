// server/routes/routes.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const dataPath = path.join(__dirname, '../data/routes.json');

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

  const testUser = { id: 'user123', username: 'test' };
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

module.exports = router;