const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
// local json storage for now
const dataPath = path.join(__dirname, '../data/routes.json');
// for future postgeSQL
// const pool = require('../db');

const ensureDataFile = () => {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify([]));
};

// dummy user
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) return res.status(401).json({ error: 'Please log in first' });
  next();
}

router.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // dummy user
  const testUser = { id: 'user123', username: 'test' };
  if (username === 'test' && password === 'password') {
    return res.json({ user: testUser });
  } else {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Future: Database query
  /*
  try {
    const result = await pool.query('SELECT id, username FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      res.json({ user: result.rows[0] });
    } } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  */
});

// save a new route
router.post('/api/routes/save', requireAuth, async (req, res) => {
  ensureDataFile();

  const userId = req.user.id;
  const { routeName, waypoints, rawStats, cueSheet, preferences } = req.body;

  if (!routeName || !waypoints) {
    return res.status(400).json({ error: 'Missing route name or waypoints' });
  }
  // for future postgreSQL
  /*
  try {
    await pool.query(
      'INSERT INTO routes (user_id, route_name, waypoints) VALUES ($1, $2, $3)',
      [userId, routeName, waypoints]
    );
    res.status(200).json({ message: 'Route saved successfully' });
  } catch (err) {
    console.error('Error saving route:', err);
    res.status(500).json({ error: 'Failed to save route' });
  }*/
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
  try {
    const raw = fs.readFileSync(dataPath);
    const routes = JSON.parse(raw);
    routes.push(newRoute);
    fs.writeFileSync(dataPath, JSON.stringify(routes, null, 2));
    return res.json({ message: 'Route saved to successfully' });}
  catch (err) {
    console.error('Error saving route:', err);
    return res.status(500).json({ error: 'Failed to save route' });
  }
});

// fetch a saved route
router.get('/api/routes', requireAuth, async (req, res) => {
  ensureDataFile();

  // for future postgreSQL
  /* const result = await pool.query(
    'SELECT id, route_name, waypoints FROM routes WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(result.rows);*/
  try {
    const raw = fs.readFileSync(dataPath);
    const routes = JSON.parse(raw);
    const userRoutes = routes.filter(route => route.userId === req.user.id);
    res.json(userRoutes || []);}
  catch (err) {
    console.error('Error fetching routes:', err);
    return res.status(500).json({ error: 'Failed to fetch routes' });
  }

});

module.exports = router;