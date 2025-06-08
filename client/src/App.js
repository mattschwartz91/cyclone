import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map from './map/Map';
import './App.css';

function App() {
  const [rides, setRides] = useState([]);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/rides`)
      .then(response => setRides(response.data))
      .catch(error => console.error('Error fetching rides:', error));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(`${process.env.REACT_APP_API_URL}/rides`, {
      startAddress,
      endAddress,
    })
      .then(response => {
        setRides([...rides, response.data]);
        setStartAddress('');
        setEndAddress('');
      })
      .catch(error => console.error('Error adding ride:', error));
  };

  return (
    <div className="App">
      <h1>Cyclone</h1>
      <div className="container">
        <div className="left-panel">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Start Address"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="End Address"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              required
            />
            <button type="submit">Add Ride</button>
          </form>
          <ul>
            {rides.map(ride => (
              <li key={ride.id}>
                From: {ride.startAddress} <br /> To: {ride.endAddress}
              </li>
            ))}
          </ul>
        </div>
        <div className="right-panel">
          <h2>Ride Map</h2>
          <Map rides={rides} />
        </div>
      </div>
    </div>
  );
}

export default App;