const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { DATA_DIR } = require('../config/config.js');
const dataPath = path.join(DATA_DIR, 'routes.json');
const profilesPath = path.join(DATA_DIR, 'profiles.json');
const avatarsDir = path.join(DATA_DIR, 'avatars');
const axios = require('axios');

if (!fssync.existsSync(avatarsDir)) {
  try {
    fssync.mkdirSync(avatarsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Error creating avatars directory ${avatarsDir}: ${err.message}`);
    }
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.body.id || Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
      return cb(new Error('Only JPG and PNG files are allowed'));
    }
    cb(null, true);
  }
});

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
  const dir = path.dirname(profilesPath);
  try {
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(profilesPath);
    } catch {
      await fs.writeFile(profilesPath, JSON.stringify([]));
    }
    const raw = await fs.readFile(profilesPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading profiles file:', err);
    throw err;
  }
};

const writeProfiles = async (profiles) => {
  await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
};

router.post('/plan/save', async (req, res) => {
  try {
    await ensureDataFile();

    const username = req.session.user?.username;
    const { routeName, waypoints, rawStats, cueSheet, preferences } = req.body;

    if (!Array.isArray(waypoints)) {
      console.log('Save route failed: Missing or invalid routeName/waypoints', { body: req.body });
      return res.status(400).json({ error: 'Missing or invalid route name or waypoints' });
    }

    if (routeName) {
      let userRoutes = [];
      const data = await fs.readFile(dataPath, 'utf-8');
      userRoutes = JSON.parse(data || "{}");
      if (userRoutes?.some(r => r.username === username && r.routeName.trim().toLowerCase() === routeName.trim().toLowerCase())) {
        return res.status(409).json({ error: "Route name already exists for this user." });
      }
    }

    const newRoute = {
      id: Date.now(),
      username,
      routeName: routeName || new Date().toISOString(),
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
    res.json({ message: 'Route saved successfully' });
  } catch (err) {
    console.error('Error saving route:', err);
    res.status(500).json({ error: `Failed to save route: ${err.message}` });
  }
});

router.post('/import-route', requireAuth, async (req, res) => {
  try {
    await ensureDataFile();
    const username = req.session.user.username;
    const { routeName, waypoints, rawStats, cueSheet, forceImport } = req.body;

    if (!routeName || !Array.isArray(waypoints) || waypoints.length === 0) {
      console.log('Import route failed: Missing or invalid routeName/waypoints', { body: req.body });
      return res.status(400).json({ error: 'Missing or invalid route name or waypoints' });
    }

    const newRoute = {
      id: Date.now(),
      username,
      routeName,
      waypoints,
      rawStats: rawStats || null,
      cueSheet: cueSheet || [],
      preferences: null,
      createdAt: new Date().toISOString(),
    };

    let routes = [];
    try {
      const raw = await fs.readFile(dataPath, 'utf8');
      routes = JSON.parse(raw || '[]');
      if (!Array.isArray(routes)) {
        console.warn('routes.json corrupted, resetting to empty array');
        routes = [];
      }
    } catch (err) {
      console.warn('Error parsing routes.json, resetting to empty array:', err);
      routes = [];
    }

    const userRoutes = routes.filter(r => r.username === username);

    if (!forceImport && userRoutes.some(r => r.routeName.trim().toLowerCase() === routeName.trim().toLowerCase())) {
      return res.status(409).json({ error: "Route name already exists", duplicateType: "name" });
    }

    if (!forceImport && userRoutes.some(r => JSON.stringify(r.waypoints) === JSON.stringify(waypoints))) {
      return res.status(409).json({ error: "A similar route already exists", duplicateType: "similar" });
    }

    routes.push(newRoute);
    await fs.writeFile(dataPath, JSON.stringify(routes, null, 2));
    res.json({ message: 'GPX Route imported successfully' });
  } catch (err) {
    console.error('Error importing GPX route:', err);
    res.status(500).json({ error: `Failed to import GPX route: ${err.message}` });
  }
});

router.get('/plan', requireAuth, async (req, res) => {
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

router.get('/user/profile', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const profiles = await readProfiles();
    const user = profiles.find((u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Failed to read profile:', err);
    res.status(500).json({ error: 'Failed to read profile' });
  }
});

router.put('/user/profile', requireAuth, upload.single('avatar'), async (req, res) => {
  const { id } = req.query;
  const userId = req.user?.id;
  const { name, address } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing user id' });

  try {
    const profiles = await readProfiles();
    const index = profiles.findIndex((u) => String(u.userId) === String(userId));
    if (index === -1) return res.status(404).json({ error: 'User not found' });

    let avatarPath = profiles[index].avatar || '';
    if (req.file) {
      avatarPath = `/avatars/${req.file.filename}`;
    }

    profiles[index] = { ...profiles[index], name, address, avatar: avatarPath };
    await writeProfiles(profiles);

    console.log('Updated profile for', username);
    res.json(profiles[index]);
  } catch (err) {
    console.error('Failed to update profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/user/stats', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing userId' });

  res.json({});
});

router.get('/routes', (req, res) => {
  const username = req.query.username;
  const routesPath = path.join(DATA_DIR, 'routes.json');

  try {
    const data = fs.readFileSync(routesPath, 'utf-8');
    const allRoutes = JSON.parse(data);
    const userRoutes = allRoutes.filter(route => route.username === username);
    res.json(userRoutes);
  } catch (error) {
    console.error('Error reading routes.json:', error);
    res.status(500).json({ error: 'Failed to load user routes' });
  }
});

router.get('/user/routes', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const routes = JSON.parse(raw);
    const userRoutes = routes.filter(route => route.username === username);
    res.json(userRoutes);
  } catch (error) {
    console.error('Error reading routes.json:', error);
    res.status(500).json({ error: 'Failed to load user routes' });
  }
});

router.post('/plan-route', requireAuth, async (req, res) => {
  const { start, end } = req.body;
  if (!Array.isArray(start) || !Array.isArray(end)) {
    return res.status(400).json({ error: 'Invalid start or end coordinates' });
  }

  const coordinates = `${start.join(',')};${end.join(',')}`;
  const url = `http://localhost:3000/route/v1/bicycle/${coordinates}?overview=full&geometries=geojson`;

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

router.get('/profile-data', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const profilesPath = path.join(DATA_DIR, 'profiles.json');
    const profiles = JSON.parse(fssync.readFileSync(profilesPath, 'utf8'));

    const profile = profiles.find(p => p.username === username);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    console.log("profile: ", profile);
    res.json(profile);
  } catch (err) {
    console.error("Error reading profiles:", err);
    res.status(500).json({ error: "Failed to load profiles" });
  }
});

router.delete('/delete-routes/:id', requireAuth, async (req, res) => {
  try {
    await ensureDataFile();
    const routeId = req.params.id;
    const username = req.session.user.username;

    const raw = await fs.readFile(dataPath, 'utf8');
    let routes = JSON.parse(raw || '[]');

    const routeIndex = routes.findIndex(route => String(route.id) === String(routeId));
    if (routeIndex === -1) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (routes[routeIndex].username !== username) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own routes' });
    }

    routes = routes.filter(route => String(route.id) !== String(routeId));
    await fs.writeFile(dataPath, JSON.stringify(routes, null, 2));
    res.status(200).json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: 'Failed to delete route: ' + error.message });
  }
});

module.exports = router;