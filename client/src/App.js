import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map from './map/Map';
import './App.css';

import GoogleLogo from './assets/google-logo.svg';
import FacebookLogo from './assets/facebook-logo.svg';
import XLogo from './assets/x-logo.svg';

function App() {
  const [rides, setRides] = useState([]);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [rideType, setRideType] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    axios.get(`${process.env.REACT_APP_API_URL}/rides/${userId}`)
      .then(response => setRides(response.data))
      .catch(error => console.error('Error fetching rides:', error));
  }, [userId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(`${process.env.REACT_APP_API_URL}/rides`, {
      userId,
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

  const handleSaveRoute = () => {
  if (!userId) return;
  axios.post(`${process.env.REACT_APP_API_URL}/rides`, {
    userId,
    startAddress,
    endAddress,
    rideType,
  })
    .then(response => {
      setRides([...rides, response.data]);
      alert('Route saved!');
    })
    .catch(error => console.error('Error saving route:', error));
};

  /* const handleSocialLogin = (provider) => {
    alert(`Login with ${provider} clicked (placeholder)`);
  };*/
  // dummy login
  const handleSocialLogin = (provider) => {
    const simulatedUserId = `${provider.toLowerCase()}-user-123`;
    setUserId(simulatedUserId);
    alert(`Logged in as ${simulatedUserId}`);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Cyclone</h1>
        <div className="auth-buttons">
          <button className="login-button">Log In/Sign Up</button>
          <button className="social-login-button" onClick={() => handleSocialLogin('Google')}>
            <img src={GoogleLogo} alt="Google Logo" />
          </button>
          <button className="social-login-button" onClick={() => handleSocialLogin('Facebook')}>
            <img src={FacebookLogo} alt="Facebook Logo" />
          </button>
          <button className="social-login-button" onClick={() => handleSocialLogin('X')}>
            <img src={XLogo} alt="X Logo" />
          </button>
        </div>
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
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit">Generate Route</button>
              <button
              type="button"
              onClick={handleSaveRoute}
              disabled={!userId}
              style={{
                backgroundColor: userId ? '#2196F3' : '#ccc',
                color: userId ? 'white' : '#666',
                cursor: userId ? 'pointer' : 'not-allowed'
              }}
              >
                Save Route
                </button>
                </div>
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