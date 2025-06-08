import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map from './map/Map';
import './App.css';

function App() {
  const [rides, setRides] = useState([]);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [rideType, setRideType] = useState('');

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
      rideType,
    })
      .then(response => {
        setRides([...rides, response.data]);
        setStartAddress('');
        setEndAddress('');
        setRideType('');
      })
      .catch(error => console.error('Error adding ride:', error));
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Cyclone</h1>
        <button className="login-button">Log In/Sign Up</button>
      </header>
      <div className="container">
        <div className="sidebar">
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
            <div className="ride-mode-container">
              <h3>Ride Mode</h3>
              <div className="ride-type-options">
                <label className="ride-type-label">
                  <input
                    type="radio"
                    name="rideType"
                    value="The Sight Seer"
                    checked={rideType === 'The Sight Seer'}
                    onChange={(e) => setRideType(e.target.value)}
                  />
                  The Sight Seer
                </label>
                <label className="ride-type-label">
                  <input
                    type="radio"
                    name="rideType"
                    value="The Crit Racer"
                    checked={rideType === 'The Crit Racer'}
                    onChange={(e) => setRideType(e.target.value)}
                  />
                  The Crit Racer
                </label>
                <label className="ride-type-label">
                  <input
                    type="radio"
                    name="rideType"
                    value="Social Ride Group Leader"
                    checked={rideType === 'Social Ride Group Leader'}
                    onChange={(e) => setRideType(e.target.value)}
                  />
                  Social Ride Group Leader
                </label>
              </div>
            </div>
          </form>
          <ul className="ride-list">
            {rides.map(ride => (
              <li key={ride.id}>
                From: {ride.startAddress} <br />
                To: {ride.endAddress} <br />
                Type: {ride.rideType}
              </li>
            ))}
          </ul>
        </div>
        <div className="map-panel">
          <Map rides={rides} />
        </div>
      </div>
    </div>
  );
}

export default App;