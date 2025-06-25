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

// save a new route
router.post('/api/routes/save', requireAuth, async (req, res) => {
  ensureDataFile();

  const userId = req.user.id;
  const { routeName, waypoints } = req.body;

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
    waypoints,
    createdAt: new Date().toISOString(),
  };
  const raw = fs.readFileSync(dataPath);
  const routes = JSON.parse(raw);
  routes.push(newRoute);
  fs.writeFileSync(dataPath, JSON.stringify(routes, null, 2));

  res.json({ message: 'Route saved to successfully' });
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

  const raw = fs.readFileSync(dataPath);
  const routes = JSON.parse(raw);
  const userRoutes = routes.filter(route => route.userId === req.user.id);

  res.json(userRoutes || []);

});

module.exports = router;