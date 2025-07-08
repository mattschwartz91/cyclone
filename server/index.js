const express = require('express');
const cors = require('cors');
const routeApi = require('./routes/routes');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

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

app.get('/', (req, res) => {
  res.json({ message: 'Cyclone API server is running. Access the frontend at http://localhost:5173.' });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚴 Server running at http://localhost:${PORT}`);
});