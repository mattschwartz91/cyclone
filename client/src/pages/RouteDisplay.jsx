import React, { useEffect, useState } from 'react';
import config from '../config';
import { MapContainer, TileLayer } from 'react-leaflet';

// UI & components
import GpxLoader from '../components/GpxLoader';
import StatsCard from '../components/StatsCard';
import RoutePreferences from '../components/RoutePreferences';
import CueSheet from '../components/CueSheet';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Header from '../components/ui/Header';

export default function RouteDisplay() {
  const [cueSheet, setCueSheet] = useState([]);
  const [unitSystem, setUnitSystem] = useState("imperial");
  const [rawStats, setRawStats] = useState({ distanceKm: null, elevationM: null });
  const [routeName, setRouteName] = useState("Default Route");
  const [waypoints, setWaypoints] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preferences, setPreferences] = useState({
    startingPoint: null,
    endingPoint: null,
    distanceTarget: null,
    elevationTarget: null,
    bikeLanes: false,
    pointsOfInterest: false,
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const routeReady = user?.id && routeName.trim() && Array.isArray(waypoints) && waypoints.length > 0;

  useEffect(() => {
    if (!user || !user.id) return;
    fetch('/api/plan', {
      headers: { 'X-User': JSON.stringify(user), 'Accept': 'application/json' }
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        const text = await res.text();
        return text ? JSON.parse(text) : [];
      })
      .then(setSavedRoutes)
      .catch(err => console.error('Failed to load saved routes:', err));
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user || !user.id) {
      setError('Please log in to save routes.');
      return;
    }

    if (!routeName.trim() || waypoints.length === 0) {
      setError('Route name and waypoints are required.');
      return;
    }

    const routeData = {
      routeName: routeName.trim(),
      waypoints,
      rawStats,
      cueSheet,
      preferences,
    };

    try {
      const res = await fetch('/api/plan/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': JSON.stringify(user),
        },
        body: JSON.stringify(routeData),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Route saved successfully!');
        setSavedRoutes(prev => [...prev, { ...routeData, id: Date.now(), createdAt: new Date().toISOString() }]);
        setRouteName("Default Route");
      } else {
        setError(data.error || 'Failed to save route.');
      }
    } catch (err) {
      console.error('Error saving route:', err);
      setError('Unable to connect to the server.');
    }
  };

  return (
    <div className="bg-base min-h-screen text-gray-800 p-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <RoutePreferences preferences={preferences} setPreferences={setPreferences} />
            <Button className="w-full">Generate Route</Button>
            <form onSubmit={handleSave}>
              <Button
                type="submit"
                className={`w-full ${
                    routeReady
                    ? 'bg-black text-white hover:bg-gray-900'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
                disabled={!routeReady}
              >
                Save Route
              </Button>
            </form>
            {error && <p className="text-red-500">{error}</p>}
            {success && <p className="text-green-500">{success}</p>}
          </div>

          <div className="lg:col-span-6 flex flex-col items-center space-y-4">
            <Header className="font-semibold text-center" level={2}>{routeName}</Header>
            <input
              type="text"
              className="border p-2 w-full rounded"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Enter route name"
            />
            <div className="w-full h-[400px] lg:h-[500px] xl:h-[600px] rounded-xl shadow-lg overflow-hidden">
              <MapContainer className="h-full w-full" center={[39.95, -75.16]} zoom={13}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <GpxLoader
                  waypoints={waypoints}
                  setWaypoints={setWaypoints}
                  onStatsReady={setRawStats}
                  onSCuesReady={setCueSheet}
                />
              </MapContainer>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card>
              <StatsCard stats={rawStats} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />
            </Card>
            <CueSheet cueSheet={cueSheet} />
            <Button as="a" href="/chill_hills.gpx" download="chill_hills.gpx" className="w-full">
              Export GPX
            </Button>
          </div>
        </div>
        {savedRoutes.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-semibold mb-2">Your Saved Routes</h3>
            <ul className="space-y-2">
              {savedRoutes.map((r, idx) => (
                <li key={idx} className="border p-3 rounded">
                  <strong>{r.routeName}</strong>
                  <br />
                  Waypoints: {Array.isArray(r.waypoints)
                    ? r.waypoints.map(w => `(${w.lat}, ${w.lon})`).join(', ')
                    : 'No waypoints'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}