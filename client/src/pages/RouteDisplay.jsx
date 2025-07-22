import React, { useEffect, useState } from 'react';
import config from '../config';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'; // Added Polyline, Marker, Popup
import 'leaflet/dist/leaflet.css';

// UI & components
import GpxLoader from '../components/GpxLoader';
import StatsCard from '../components/StatsCard';
import RoutePreferences from '../components/RoutePreferences';
import CueSheet from '../components/CueSheet';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Header from '../components/ui/Header';

function SavedRoutesModal({ routes, onLoad, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold text-center mb-4 text-gray-800">Saved Routes</h2>

        {routes.length > 0 ? (
          <ul className="divide-y divide-gray-300">
            {routes.map(route => (
              <li
                key={route.id}
                className="py-3 px-4 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  onLoad(route.id);
                  onClose();
                }}
              >
                {route.routeName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-gray-600">No saved routes.</p>
        )}

        <button
          className="mt-4 w-full py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function RouteDisplay() {
  const [cueSheet, setCueSheet] = useState([]);
  const [unitSystem, setUnitSystem] = useState("imperial");
  const [rawStats, setRawStats] = useState({ distanceKm: null, elevationM: null });
  const [routeName, setRouteName] = useState("Default Route");
  const [waypoints, setWaypoints] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    const loadSavedRoutes = async () => {
      try {
        const res = await fetch('/api/routes'); // ✅ Fetch from backend
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const routes = await res.json();
        const userRoutes = routes.filter(r => r.userId === user.id);
        setSavedRoutes(userRoutes);
      } catch (err) {
        console.error('Failed to load saved routes from backend:', err);
        setError('Failed to load saved routes.');
      }
    };

    loadSavedRoutes();
  }, [user]);

  const geocodeAddress = async (address) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (!data || !data[0]) throw new Error(`Could not geocode: ${address}`);
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  };

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

    const timestamp = Date.now();

    const routeData = {
      id: timestamp,
      userId: user.id,
      routeName: routeName.trim(),
      waypoints,
      rawStats,
      cueSheet,
      preferences,
      createdAt: new Date(timestamp).toISOString(),
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
        setSavedRoutes(prev => [...prev, routeData]);
        setRouteName("Default Route");
      } else {
        setError(data.error || 'Failed to save route.');
      }
    } catch (err) {
      console.error('Error saving route:', err);
      setError('Unable to connect to the server.');
    }
  };

  const handlePlanRoute = async () => {
    setError('');
    setSuccess('');

    if (
      !preferences.startingPoint ||
      !preferences.endingPoint ||
      !Array.isArray(preferences.startingPoint) ||
      !Array.isArray(preferences.endingPoint)
    ) {
      setError('Please select valid starting and ending points.');
      return;
    }

    try {
      const startCoord = await geocodeAddress(preferences.startingPoint);
      const endCoord = await geocodeAddress(preferences.endingPoint);

      const res = await fetch('/api/plan-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': JSON.stringify(user)
        },
        body: JSON.stringify({
          start: startCoord,
          end: endCoord
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Route planning failed');
      }

      const coords = data.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
      setWaypoints(coords);
      setRawStats({ distanceKm: data.distance / 1000, elevationM: 0 });
      setCueSheet([]);
      setSuccess('Route planned successfully!');
    } catch (err) {
      console.error('Error planning route:', err);
      setError(err.message);
    }
  };

  const handleLoadRoute = (routeId) => {
    const selectedRoute = savedRoutes.find(route => String(route.id) === String(routeId));
    if (selectedRoute) {
      if (selectedRoute.userId !== user.id) {
        setError('You do not have permission to load this route.');
        return;
      }
      setRouteName(selectedRoute.routeName);
      setWaypoints(selectedRoute.waypoints);
      setRawStats(selectedRoute.rawStats || { distanceKm: null, elevationM: null });
      setCueSheet(selectedRoute.cueSheet || []);
      setPreferences(selectedRoute.preferences || preferences);
      setSelectedRouteId(routeId);
      setSuccess('Route loaded successfully!');
    } else {
      setError('Route not found.');
    }
  };

  const handleTestSaveStraightRoute = async () => {
    setError('');
    setSuccess('');

    if (!user || !user.id) {
      setError('Please log in to save routes.');
      return;
    }

    const from = preferences.startingPoint || "Philadelphia, PA";
    const to = preferences.endingPoint || "New York, NY";

    try {
      const startCoord = await geocodeAddress(from);
      const endCoord = await geocodeAddress(to);
      const defaultName = `Straight line: ${startCoord} to ${endCoord}`;
      const nameToSave = routeName.trim() !== '' ? routeName : defaultName;

      const route = {
        id: Date.now(),
        userId: user.id,
        routeName: nameToSave,
        waypoints: [
          { lat: startCoord[1], lon: startCoord[0] },
          { lat: endCoord[1], lon: endCoord[0] },
        ],
        rawStats: {
          distanceKm: Math.sqrt(
            Math.pow(startCoord[0] - endCoord[0], 2) +
            Math.pow(startCoord[1] - endCoord[1], 2)
          ) * 111,
          elevationM: 0,
        },
        cueSheet: [],
        preferences,
        createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/plan/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': JSON.stringify(user),
        },
        body: JSON.stringify(route),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Test route saved successfully!');
        setSavedRoutes(prev => [...prev, route]);
      } else {
        setError(data.error || 'Failed to save test route.');
      }
    } catch (err) {
      console.error('Failed to save test route:', err);
      setError('Could not create or save test route.');
    }
  };

  return (
    <div className="bg-base min-h-screen text-gray-800 p-4 relative z-0">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <RoutePreferences preferences={preferences} setPreferences={setPreferences} />
            <Button className="w-full" onClick={handlePlanRoute}>Generate Route</Button>
            <form onSubmit={handleSave}>
              <Button
                type="submit"
                className={`w-full ${routeReady
                  ? 'bg-black text-white hover:bg-gray-900'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                disabled={!routeReady}
              >
                Save Route
              </Button>
              {/* For testing only */}
              <Button className="w-full bg-blue-200" onClick={handleTestSaveStraightRoute}>
                Save Test Straight Route
              </Button>
            </form>
            {user?.id ? (
              savedRoutes.length > 0 ? (
                <div>
                  <Button className="w-full" onClick={() => setIsModalOpen(true)}>
                    Load Saved Routes
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">No saved routes found for your account.</p>
              )
            ) : (
              <p className="text-gray-500">Please log in to view your saved routes.</p>
            )}
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
                {waypoints.length > 1 && (
                  <>
                    <Polyline
                      positions={waypoints.map(w => [w.lat, w.lon])}
                      color="blue"
                      weight={4}
                      opacity={0.7}
                    />
                    {waypoints.map((w, idx) => (
                      <Marker key={idx} position={[w.lat, w.lon]}>
                        <Popup>Waypoint {idx + 1}</Popup>
                      </Marker>
                    ))}
                  </>
                )}
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
      </div>
      {isModalOpen && (
        <SavedRoutesModal
        routes={savedRoutes}
        onLoad={handleLoadRoute}
        onClose={() => setIsModalOpen(false)}
      />
    )}
    </div>
  );
}