import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoutePlanner() {
  const navigate = useNavigate();
  const [routeName, setRouteName] = useState('');
  const [waypoints, setWaypoints] = useState('');
  const [savedRoutes, setSavedRoutes] = useState([]);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetch('/api/routes', {
      headers: { 'X-User': JSON.stringify(user) }
    })
      .then(res => res.json())
      .then(data => setSavedRoutes(data))
      .catch(err => console.error('Failed to load saved routes', err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!routeName || !waypoints) {
      alert('Please provide both route name and waypoints.');
      return;
    }

    const res = await fetch('/api/routes/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User': JSON.stringify(user)
      },
      body: JSON.stringify({
        routeName,
        waypoints: waypoints.split(',').map(p => p.trim())
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Route saved!');
      setSavedRoutes(prev => [...prev, { routeName, waypoints: waypoints.split(',') }]);
      setRouteName('');
      setWaypoints('');
    } else {
      alert(data.error || 'Failed to save route');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Plan a Route</h2>

      <form onSubmit={handleSave} className="mb-6 space-y-3">
        <input
          type="text"
          placeholder="Route name"
          className="w-full p-2 border rounded"
          value={routeName}
          onChange={e => setRouteName(e.target.value)}
        />
        <textarea
          placeholder="Waypoints (comma-separated)"
          className="w-full p-2 border rounded"
          value={waypoints}
          onChange={e => setWaypoints(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Save Route
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-2">Your Saved Routes</h3>
      <ul className="space-y-2">
        {savedRoutes.map((r, idx) => (
          <li key={idx} className="border p-3 rounded">
            <strong>{r.route_name || r.routeName}</strong>
            <br />
            Waypoints: {Array.isArray(r.waypoints) ? r.waypoints.join(', ') : JSON.stringify(r.waypoints)}
          </li>
        ))}
      </ul>
    </div>
  );
}