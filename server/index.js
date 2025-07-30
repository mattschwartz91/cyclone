const express = require('express');
const cors = require('cors');
const routeApi = require('./routes/routes');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const profilesPath = path.join(__dirname, 'data', 'profiles.json');

app.use(cors());
app.use(express.json());

// dummy user
app.use((req, res, next) => {
  const rawUser = req.headers['x-user'];
  if (rawUser) {
    try {
      req.user = JSON.parse(rawUser);
    } catch {
      req.user = null;
    }
  }
  next();
});

const readProfiles = () => {
  const raw = fs.readFileSync(profilesPath);
  return JSON.parse(raw);
};

const writeProfiles = (profiles) => {
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
};

app.get('/', (req, res) => {
  res.json({ message: 'Cyclone API server is running. Access the frontend at http://localhost:5173.' });
});

app.put('/api/user/profile', (req, res) => {
  const { id, name, address } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing user ID' });

  const profiles = readProfiles();
  const index = profiles.findIndex((u) => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  profiles[index] = { ...profiles[index], name, address };
  writeProfiles(profiles);
  res.json(profiles[index]);
});

app.get('/api/routes', (req, res) => {
  const routesPath = path.join(__dirname, 'data', 'routes.json');
  fs.readFile(routesPath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading routes.json:', err);
      return res.status(500).json({ error: 'Failed to load routes' });
    }
    try {
      const routes = JSON.parse(data);
      res.json(routes);
    } catch (parseErr) {
      res.status(500).json({ error: 'Invalid JSON format' });
    }
  });
});

// Routes
app.use(routeApi);
const routes = require('./routes/routes');
app.use(routes);

// Start server
app.listen(PORT, () => {
  console.log(`🚴 Server running at http://localhost:${PORT}`);
});