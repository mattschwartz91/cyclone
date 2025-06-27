import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GpxLoader from '../components/GpxLoader';
import StatsCard from '../components/StatsCard';
import RoutePreferences from '../components/RoutePreferences';
import CueSheet from '../components/CueSheet';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Header from '../components/ui/Header';
import Map from './Map';

export default function RoutePlan() {
  const navigate = useNavigate();
  const [routeName, setRouteName] = useState('');
  const [waypoints, setWaypoints] = useState([]);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [rawStats, setRawStats] = useState({ distanceKm: null, elevationM: null });
  const [cueSheet, setCueSheet] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unitSystem, setUnitSystem] = useState('imperial');
  const [preferences, setPreferences] = useState({
    startingPoint: null,
    endingPoint: null,
    distanceTarget: null,
    elevationTarget: null,
    bikeLanes: false,
    pointsOfInterest: false,
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user || !user.id) {
      navigate('/login');
      return;
    }

    fetch('/api/plan', {
      headers: { 'X-User': JSON.stringify(user), 'Accept': 'application/json' }
    })
      .then(async res => {
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} ${errorText}`);
      }

      const text = await res.text();
      if (!text) throw new Error('Empty response from server');

      return JSON.parse(text);
    })
      .then(data => setSavedRoutes(data))
      .catch(err => console.error('Failed to load saved routes', err));
    }, [user, navigate]);

    const handleSave = async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

    if (!user || !user.id) {
      setError('Please log in to save routes.');
      return;
    }

    if (!routeName.trim() || !waypoints) {
      alert('Please provide both route name and waypoints.');
      return;
    }

    if (!Array.isArray(waypoints) || waypoints.length === 0) {
      setError('No valid waypoints available. Please load or generate a route.');
      return;
    }
    
    const routeData = {
      routeName: routeName.trim(),
      waypoints: waypoints || [],
      rawStats: rawStats || null,
      cueSheet: cueSheet || [],
      preferences: preferences || null,
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
        setRouteName('Default Route');
        setSavedRoutes(prev => [...prev, { ...routeData, id: Date.now(), userId: user.id, createdAt: new Date().toISOString() }]);
        setError('');
      } else {
        setError(data.error || 'Failed to save route.');
      }
      } catch (err) {
        console.error('Error saving route:', err);
        setError('Unable to connect to the server. Please check if the server is running.');
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Header level={2} className="text-2xl font-bold mb-4">Plan a Route</Header>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      {user.id ? (
        <div className="mb-4">
          <label htmlFor="routeName" className="block text-sm font-medium text-gray-700">
            Route Name
          </label>
          <input
            id="routeName"
            type="text"
            placeholder="Enter route name"
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={routeName}
            onChange={e => setRouteName(e.target.value)}
          />
        </div>
      ) : (
        <p className="text-red-500 mb-4">Please log in to save routes.</p>
      )}
      <GpxLoader setWaypoints={setWaypoints} setRawStats={setRawStats} setCueSheet={setCueSheet} />
      <RoutePreferences preferences={preferences} setPreferences={setPreferences}/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1">
          {Array.isArray(waypoints) && <Map waypoints={waypoints} />}
        </Card>
        <Card className="col-span-1">
          {rawStats?.distanceKm && rawStats?.elevationM && <StatsCard stats={rawStats} unitSystem={unitSystem} setUnitSystem={setUnitSystem} />}
          {Array.isArray(cueSheet) && cueSheet.length > 0 && <CueSheet cueSheet={cueSheet} />}
          <form onSubmit={handleSave}>
            <Button
              type="submit"
              className={`mt-4 w-full ${
                !user.id || !routeName.trim() || waypoints.length === 0
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={!user.id || !routeName.trim() || waypoints.length === 0}
            >
              Save Route
            </Button>
          </form>
        </Card>
      </div>
      <h3 className="text-xl font-semibold mt-6 mb-2">Your Saved Routes</h3>
      <ul className="space-y-2">
        {savedRoutes.map((r, idx) => (
          <li key={idx} className="border p-3 rounded">
            <strong>{r.routeName}</strong>
            <br />
            Waypoints: {Array.isArray(r.waypoints) ? r.waypoints.map(w => `(${w.lat}, ${w.lon})`).join(', ') : JSON.stringify(r.waypoints)}
          </li>
        ))}
      </ul>
    </div>
  );
}