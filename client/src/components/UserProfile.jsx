import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from './Button';
import { useAuthModal } from '../contexts/AuthModalContext';
import { useAuth } from '../contexts/AuthContext';
import { homeBackground } from '../constants';
import * as toGeoJSON from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';
import { generateGpxFile } from '../utils/routeApi';
import { API_BASE_URL } from '../utils/apiBase.js';

export default function UserProfile() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ distanceKm: 0, elevationM: 0 });
  const [routes, setRoutes] = useState([]);
  const [routeAddresses, setRouteAddresses] = useState({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();
  const fileInputRef = useRef(null); // Reference for file input
  const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

  // Helper function to build correct avatar URL
  const getAvatarUrl = (user) => {
    const avatar = user?.profilePicture || user?.avatar;
    if (!avatar || avatar === '/avatars/default-avatar.png') {
      return '/avatars/default-avatar.png';
    }
    if (avatar.startsWith('http')) return avatar;
    return API_BASE_URL ? `${API_BASE_URL}${avatar}` : avatar;
  };

  function haversineDistance(coord1, coord2) {
    const R = 6371000; // earth radius in meters
    const toRad = (x) => (x * Math.PI) / 180;

    const dLat = toRad(coord2.lat - coord1.lat);
    const dLon = toRad(coord2.lon - coord1.lon);
    const lat1 = toRad(coord1.lat);
    const lat2 = toRad(coord2.lat);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c / 1000;
  }

  function calculateBearing(p1, p2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const toDeg = (x) => (x * 180) / Math.PI;

    const y = Math.sin(toRad(p2.lon - p1.lon)) * Math.cos(toRad(p2.lat));
    const x =
      Math.cos(toRad(p1.lat)) * Math.sin(toRad(p2.lat)) -
      Math.sin(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
      Math.cos(toRad(p2.lon - p1.lon));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function generateCueSheet(waypoints) {
    const cues = [];
    if (waypoints.length < 2) return cues;

    function getDirectionType(turn) {
      if (turn > 30 && turn <= 100) return 1;
      if (turn < -30 && turn >= -100) return 0;
      if (turn > 100) return 2;
      if (turn < -100) return 3;
      if (Math.abs(turn) <= 30) return 6;
      return 6;
    }

    const initialBearing = calculateBearing(waypoints[0], waypoints[1]);
    const initialDistance = haversineDistance(waypoints[0], waypoints[1]);
    cues.push({
      instruction: "Start",
      distance_m: Number(initialDistance * 1000).toFixed(1),
      type: 11,
      duration: 0,
    });

    let accumulatedDistance = 0;

    for (let i = 2; i < waypoints.length; i++) {
      const bearing1 = calculateBearing(waypoints[i - 2], waypoints[i - 1]);
      const bearing2 = calculateBearing(waypoints[i - 1], waypoints[i]);
      const distance = haversineDistance(waypoints[i - 1], waypoints[i]);
      const turn = bearing2 - bearing1;

      let type = getDirectionType(turn);
      let instruction =
        type === 0 ? "Turn left" :
          type === 1 ? "Turn right" :
            type === 2 ? "Sharp right" :
              type === 3 ? "Sharp left" :
                "Continue straight";

      if (type === 6 || accumulatedDistance < 0.01) {
        accumulatedDistance += distance;
      } else {
        if (accumulatedDistance > 0) {
          cues.push({
            instruction: "Continue straight",
            distance_m: Number(accumulatedDistance * 1000).toFixed(1),
            type: 6,
            duration: 0,
          });
          accumulatedDistance = 0;
        }
        cues.push({
          instruction,
          distance_m: Number(distance * 1000).toFixed(1),
          type,
          duration: 0,
        });
      }
    }

    if (accumulatedDistance > 0) {
      cues.push({
        instruction: "Continue straight",
        distance_m: Number(accumulatedDistance * 1000).toFixed(1),
        type: 6,
        duration: 0,
      });
    }

    cues.push({
      instruction: "Arrive at destination",
      distance_m: 0,
      type: 10,
      duration: 0,
    });

    return cues;
  }

  const fetchRoutes = async () => {
    try {
      const base = API_BASE_URL || '';
      const res = await fetch(`${base}/api/routes`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Not authenticated for routes - user may need to log in again');
          return;
        }
        console.error('Failed to fetch routes:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      setRoutes(data);

      const addresses = {};
      for (const route of data) {
        const start = route.waypoints[0];
        const end = route.waypoints[route.waypoints.length - 1];
        addresses[route.id] = {
          start: { address: 'Loading...', error: null },
          end: { address: 'Loading...', error: null },
        };

        try {
          const startRes = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${start.lat}&lon=${start.lon}&type=street&apiKey=${GEOAPIFY_API_KEY}`
          );
          const startData = await startRes.json();
          addresses[route.id].start.address =
            startData.features?.[0]?.properties?.formatted || 'No address found';
        } catch (err) {
          addresses[route.id].start.address = 'Error fetching address';
          addresses[route.id].start.error = err.message;
        }

        try {
          const endRes = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${end.lat}&lon=${end.lon}&type=street&apiKey=${GEOAPIFY_API_KEY}`
          );
          const endData = await endRes.json();
          addresses[route.id].end.address =
            endData.features?.[0]?.properties?.formatted || 'No address found';
        } catch (err) {
          addresses[route.id].end.address = 'Error fetching address';
          addresses[route.id].end.error = err.message;
        }
      }
      setRouteAddresses(addresses);
    } catch (err) {
      console.error('Failed to load user routes:', err);
    }
  };

  const handleFileUpload = async (file, customRouteName, forceImport = false) => {
    if (!file) return;

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const gpxDoc = parser.parseFromString(text, 'text/xml');
      const geoJson = toGeoJSON.gpx(gpxDoc);

      let waypoints = [];
      if (geoJson.features && geoJson.features.length > 0) {
        const coordinates = geoJson.features[0].geometry.coordinates;
        waypoints = coordinates.map(coord => ({
          lon: coord[0],
          lat: coord[1],
          ele: coord[2] || 0,
        }));
      }

      const routeNameFinal =
        customRouteName ||
        gpxDoc.getElementsByTagName('name')[0]?.textContent ||
        file.name.replace(/\.gpx$/i, '');

      let totalDistance = 0;
      for (let i = 1; i < waypoints.length; i++) {
        totalDistance += haversineDistance(waypoints[i - 1], waypoints[i]);
      }

      const cues = generateCueSheet(waypoints);

      const formattedCues = cues.map(cue => {
        return `${cue.instruction} (${cue.distance_m} m)`;
      });

      const rawStats = {
        distanceKm: totalDistance,
        elevationM: waypoints.reduce((sum, wp, i) => {
          if (i === 0) return sum;
          const prev = waypoints[i - 1];
          const gain = wp.ele - prev.ele > 0 ? wp.ele - prev.ele : 0;
          return sum + gain;
        }, 0),
      };

      const base = API_BASE_URL || '';
      const response = await fetch(`${base}/api/routes/import-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeName: routeNameFinal,
          waypoints,
          rawStats,
          cueSheet: formattedCues,
          username: authUser.username,
          forceImport,
        }),
        credentials: 'include',
      });

      if (response.status === 409) {
        const errorData = await response.json();
        if (errorData.duplicateType === "name") {
          alert("A route with the same name already exists. Please choose a different name.");
          return;
        }
        if (errorData.duplicateType === "similar") {
          const confirmImport = window.confirm("A very similar route already exists. Do you still want to import this route?");
          if (confirmImport) {
            await handleFileUpload(file, customRouteName, true);
          }
          return;
        }
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save route');
      }
      fetchRoutes();
      setIsImportModalOpen(false);
      setRouteName('');
      fileInputRef.current.value = '';
      alert('Route imported successfully!');
    } catch (err) {
      console.error('Error processing GPX file:', err);
      alert('Failed to import route: ' + err.message);
    }
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    const file = fileInputRef.current.files[0];
    handleFileUpload(file, routeName);
  };

  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsImportModalOpen(false);
    setRouteName('');
    fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!authUser) return;

    const fetchProfile = async () => {
      try {
        const base = API_BASE_URL || '';
        const res = await fetch(`${base}/api/user/profile`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const profileData = await res.json();
        setUser(profileData);
        return profileData;
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        return null;
      }
    };

    const fetchStats = async (username) => {
      try {
        const base = API_BASE_URL || '';
        const res = await fetch(`${base}/api/user/profile/${username}/stats`, { credentials: 'include' });
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error('Failed to load user stats', err);
      }
    };

    const loadUserData = async () => {
      const profileData = await fetchProfile();
      if (profileData && profileData.username) {
        fetchStats(profileData.username);
        fetchRoutes();
      }
    };

    loadUserData();
  }, [authUser]);

  const handleRouteClick = (route) => {
    navigate('/#generate-routes', {
      state: {
        selectedRoute: route,
        fromProfile: true,
        stats: {
          distanceKm: route.total_distance_km || route.distance || 0,
          elevationM: route.elevation_gain_m || route.elevation || 0,
          totalRideTime: route.total_ride_time || null,
        },
        cueSheet: route.cueSheet || [],
      },
    });
  };

  const handleExportGpx = (route, event) => {
    event.stopPropagation(); // Prevent route click when clicking export button

    if (!route.waypoints || route.waypoints.length === 0) {
      alert("No route data available for export");
      return;
    }

    console.log("Exporting route as GPX...", route);
    const routeName = route.routeName || 'Unnamed Route';
    console.log("Route name for export:", routeName);

    // Convert waypoints to the format expected by generateGpxFile
    const routeCoordinates = route.waypoints.map(wp => ({
      lat: wp.lat,
      lon: wp.lon,
      ele: wp.ele || 0
    }));

    generateGpxFile(routeCoordinates, routeName);
  };

  // Add this function after handleExportGpx
  const handleDeleteRoute = async (routeId, event) => {
    event.stopPropagation(); // Prevent route click when clicking delete button

    try {
      const base = API_BASE_URL || '';
      const response = await fetch(`${base}/api/routes/delete-routes/${routeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete route');
      }

      // Update local state
      setRoutes(routes.filter(route => route.id !== routeId));
      setRouteAddresses(prev => {
        const newAddresses = { ...prev };
        delete newAddresses[routeId];
        return newAddresses;
      });

      setIsDeleteModalOpen(false);
      setRouteToDelete(null);
      alert('Route deleted successfully!');
    } catch (err) {
      console.error('Error deleting route:', err);
      alert('Failed to delete route: ' + err.message);
    }
  };

  // Add this helper function to open the delete confirmation modal
  const openDeleteModal = (route, event) => {
    event.stopPropagation(); // Prevent route click when clicking delete button
    setRouteToDelete(route);
    setIsDeleteModalOpen(true);
  };

  if (!authUser) {
    return (
      <div className="p-4 text-center text-n-1 font-code">
        Please log in to view your profile.
        <Button className="mt-4" onClick={() => openAuthModal('login')}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen backdrop-blur-sm border-t border-n-6 relative">
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="relative w-full h-full">
          <img
            src={homeBackground}
            className="w-full h-full object-cover opacity-80"
            alt="home-background"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-n-8/2 via-n-8/5 to-n-8/10 backdrop-blur-[1px]"></div>
        </div>
      </div>



      <div className="relative z-10">
        <div className="pt-24 px-2 lg:px-4 xl:px-6 max-w-4xl mx-auto pb-8">
          <h2 className="font-code text-2xl lg:text-3xl uppercase text-n-1 text-center mb-8">
            User Profile
          </h2>

          <Card className="flex flex-col items-center gap-6 p-6 bg-transparent backdrop-blur-sm border border-n-6 shadow-lg hover:shadow-xl">
            <img
              src={getAvatarUrl(user)}
              alt="User Avatar"
              className="w-24 h-24 rounded-full border-2 border-n-6 object-cover"
            />
            <div className="flex-1 space-y-3 text-center">
              <p className="font-code text-n-1 text-base lg:text-lg">
                <strong>Name:</strong> {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.name || 'N/A')}
              </p>
              <p className="font-code text-n-1 text-base lg:text-lg">
                <strong>Address:</strong> {user?.address || 'Not set'}
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleImportClick}>Import Route</Button>
              <Button onClick={() => navigate('/edit-profile')}>Edit Profile</Button>
            </div>
          </Card>

          {isImportModalOpen && (
            <div className="fixed inset-0 bg-n-8/80 backdrop-blur-sm flex items-center justify-center z-20">
              <Card className="p-6 bg-n-8/90 border border-n-6 shadow-lg max-w-md w-full">
                <h3 className="font-code text-xl text-n-1 mb-4">Import Route</h3>
                <form onSubmit={handleImportSubmit} className="space-y-4">
                  <div>
                    <label className="font-code text-n-1 text-sm mb-1 block">
                      Route Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      placeholder="Enter route name or leave blank"
                      className="w-full p-2 bg-n-7 border border-n-6 rounded text-n-1 font-code text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-code text-n-1 text-sm mb-1 block">
                      GPX File
                    </label>
                    <input
                      type="file"
                      accept=".gpx"
                      ref={fileInputRef}
                      className="w-full p-2 bg-n-7 border border-n-6 rounded text-n-1 font-code text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={handleCloseModal}>
                      Cancel
                    </Button>
                    <Button type="submit">Import</Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          <div className="mt-10 p-6 bg-n-8/80 backdrop-blur-sm border border-n-6 rounded-lg">
            <h3 className="font-code text-xl lg:text-2xl uppercase text-n-1 mb-4">
              Saved Routes
            </h3>

            {routes.length === 0 ? (
              <p className="text-n-1/50 font-code text-base lg:text-lg">
                No routes saved yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {routes.map((route, idx) => {
                  const distance = route.rawStats?.distanceKm ||
                    route.total_distance_km ||
                    route.distance ||
                    route.total_length_km || 0;
                  const elevation = route.rawStats?.elevationM ||
                    route.elevation_gain_m ||
                    route.elevation ||
                    route.total_elevation_gain || 0;

                  // Calculate difficulty based on elevation and distance
                  let difficulty = 'Easy';
                  if (elevation > 500 || distance > 50) difficulty = 'Hard';
                  else if (elevation > 200 || distance > 25) difficulty = 'Medium';

                  return (
                    <li
                      key={route.id || idx}
                      className="border border-n-6 rounded p-4 bg-n-7/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:bg-n-6/50 hover:scale-[1.01] hover:shadow-md"
                      onClick={() => handleRouteClick(route)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-code text-n-1 font-semibold text-base lg:text-lg">
                            {route.routeName || 'Unnamed Route'}
                          </p>
                          <p className="font-code text-n-1/50 text-sm lg:text-base">
                            Distance: {distance.toFixed(1)} km
                          </p>
                          <p className="font-code text-n-1/50 text-sm lg:text-base">
                            Difficulty: {difficulty}
                          </p>
                        </div>
                        <Button
                          className="ml-4 px-3 py-1 text-xs"
                          onClick={(e) => handleExportGpx(route, e)}
                          white
                        >
                          Export GPX
                        </Button>
                        <Button
                          className="ml-4 px-3 py-1 text-xs"
                          onClick={(e) => openDeleteModal(route, e)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  );
                })}
                {isDeleteModalOpen && (
                  <div className="fixed inset-0 bg-n-8/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <Card className="p-6 bg-n-8/90 border border-n-6 shadow-lg max-w-md w-full">
                      <h3 className="font-code text-xl text-n-1 mb-4">Confirm Delete</h3>
                      <p className="font-code text-n-1 text-sm mb-4">
                        Are you sure you want to delete the route "{routeToDelete?.routeName || 'Unnamed Route'}"?
                        This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setIsDeleteModalOpen(false);
                            setRouteToDelete(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700"
                          onClick={(e) => handleDeleteRoute(routeToDelete.id, e)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}