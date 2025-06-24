const express = require('express');
const cors = require('cors');
const routeApi = require('./routes/routes');

const app = express();
const PORT = 3000;

// dummy user
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1 }; // 🔐 Replace with real auth logic later
  next();
});

// Routes
app.use(routeApi);

// Start server
app.listen(PORT, () => {
  console.log(`🚴 Server running at http://localhost:${PORT}`);
});