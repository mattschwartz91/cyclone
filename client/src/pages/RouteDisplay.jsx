import React, { useEffect, useState } from 'react';
import config from '../config';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { saveAs } from 'file-saver';

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

  useEffect(() => {
    const fetchRouteFromOSRM = async () => {
      if (
        !Array.isArray(preferences.startingPoint) ||
        !Array.isArray(preferences.endingPoint)
      ) return;

      const [startLon, startLat] = preferences.startingPoint;
      const [endLon, endLat] = preferences.endingPoint;

      try {
        const res = await fetch(`http://localhost:5000/route/v1/bicycle/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes?.[0]) {
          const coords = data.routes[0].geometry.coordinates;
          const wp = coords.map(([lon, lat]) => ({ lat, lon }));
          setWaypoints(wp);
        }
      } catch (err) {
        console.error('OSRM routing error:', err);
      }
    };

    fetchRouteFromOSRM();
  }, [preferences.startingPoint, preferences.endingPoint]);

  function ClickHandler({ setPreferences }) {
    useMapEvents({
      click(e) {
        setPreferences(prev => {
          const latlng = [e.latlng.lng, e.latlng.lat]; // [lon, lat]
          if (!prev.startingPoint) {
            return { ...prev, startingPoint: latlng };
          } else if (!prev.endingPoint) {
            return { ...prev, endingPoint: latlng };
          } else {
            return { ...prev, startingPoint: latlng, endingPoint: null };
          }
        });
      }
    });
    return null;
  }

  const exportToGpx = () => {
    if (!Array.isArray(waypoints) || waypoints.length === 0) return;

    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Cyclone App" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>${routeName}</name><trkseg>`;

    const gpxBody = waypoints.map(wp => `<trkpt lat="${wp.lat}" lon="${wp.lon}"></trkpt>`).join('\n');

    const gpxFooter = `</trkseg></trk></gpx>`;
    const gpxContent = `${gpxHeader}\n${gpxBody}\n${gpxFooter}`;

    const blob = new Blob([gpxContent], { type: 'application/gpx+xml;charset=utf-8' });
    saveAs(blob, `${routeName || 'route'}.gpx`);
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
      const res = await fetch('/api/plan-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': JSON.stringify(user)
        },
        body: JSON.stringify({
          start: preferences.startingPoint,
          end: preferences.endingPoint
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
                className={`w-full ${routeReady
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
                <ClickHandler setPreferences={setPreferences} />
                {preferences.startingPoint && (
                  <Marker position={[preferences.startingPoint[1], preferences.startingPoint[0]]} />
                )}
                {preferences.endingPoint && (
                  <Marker position={[preferences.endingPoint[1], preferences.endingPoint[0]]} />
                )}

                {waypoints.length > 1 && (
                  <Polyline positions={waypoints.map(wp => [wp.lat, wp.lon])} color="blue" />
                )}
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
            <Button onClick={exportToGpx} className="w-full">
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