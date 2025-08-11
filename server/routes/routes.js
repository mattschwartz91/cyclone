const express = require('express');
const router = express.Router();
const pool = require('../db');

// save a new route
router.post('/api/routes/save', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { routeName, waypoints } = req.body;

  if (!routeName || !waypoints) {
    return res.status(400).json({ error: 'Missing route name or waypoints' });
  }

  try {
    await pool.query(
      'INSERT INTO routes (user_id, route_name, waypoints) VALUES ($1, $2, $3)',
      [userId, routeName, waypoints]
    );
    res.status(200).json({ message: 'Route saved successfully' });
  } catch (err) {
    console.error('Error saving route:', err);
    res.status(500).json({ error: 'Failed to save route' });
  }
});

module.exports = router;
