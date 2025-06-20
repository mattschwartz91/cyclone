const express = require('express');
const cors = require('cors');
const fs = require('fs')

const app = express();
app.use(cors());
app.use(express.json());

let rides = [];
try {
  const data = fs.readFileSync(DB_FILE)
  rides = JSON.parse(data);
}
catch (err) {
  rides = [];
}

app.get('/api/rides/:userId', (req, res) => {
  const userId = req.params.userId;
  const userRides = rides.filter(ride => ride.userId === userId);
  res.json(userRides);
});

app.post('/api/rides', (req, res) => {
  const{userId, startAddress, endAddress, rideType} = req.body;

  if (!userId || !startAddress || !endAddress) {
    return res.status(400).json({ error: 'Missing information'});
  }

  const newRide = {
    id: rides.length + 1,
    userId,
    startAddress: req.body.startAddress,
    endAddress: req.body.endAddress,
    rideType: req.body.rideType || 'None',
    savedAt: new Date().toISOString()
  };
  rides.push(newRide);
  fs.writeFileSync(DB_FILE, JSON.stringify(rides, null, 2))
  res.status(201).json(newRide);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Cyclone server running on port ${PORT}`));