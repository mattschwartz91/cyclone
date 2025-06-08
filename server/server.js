const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let rides = [
  { id: 1, startAddress: '123 Market St, Philadelphia, PA', endAddress: '456 Broad St, Philadelphia, PA', rideType: 'The Sight Seer' },
  { id: 2, startAddress: '789 Chestnut St, Philadelphia, PA', endAddress: '101 Walnut St, Philadelphia, PA', rideType: 'The Crit Racer' },
];

app.get('/api/rides', (req, res) => {
  res.json(rides);
});

app.post('/api/rides', (req, res) => {
  const newRide = {
    id: rides.length + 1,
    startAddress: req.body.startAddress,
    endAddress: req.body.endAddress,
    rideType: req.body.rideType || 'None',
  };
  rides.push(newRide);
  res.status(201).json(newRide);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Cyclone server running on port ${PORT}`));