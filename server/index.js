const express = require('express');
const cors = require('cors');
const routeApi = require('./routes/routes');

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

// Routes
app.use(routeApi);

// Start server
app.listen(PORT, () => {
  console.log(`🚴 Server running at http://localhost:${PORT}`);
});