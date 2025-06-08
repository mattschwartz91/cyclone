const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let rides = [
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