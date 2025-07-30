import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Header from '../components/ui/Header';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ distanceKm: 0, elevationM: 0 });
  const [routes, setRoutes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser?.id) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile?userId=${storedUser.id}`);
        const profileData = await res.json();
        if (res.ok) setUser(profileData);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/user/stats?userId=${storedUser.id}`);
        const data = await res.json();
        if (res.ok) setStats(data);
      } catch (err) {
        console.error('Failed to load user stats', err);
      }
    };

    const fetchRoutes = async () => {
      try {
        const res = await fetch(`/api/user/routes?userId=${storedUser.id}`);
        const data = await res.json();
        if (res.ok) setRoutes(data);
      } catch (err) {
        console.error('Failed to load user routes', err);
      }
    };

    fetchProfile();
    fetchStats();
    fetchRoutes();
  }, [navigate]);

  if (!user) {
    return <div className="p-4 text-center text-gray-600">Please log in to view your profile.</div>;
  }

  return (
    <div className="bg-base min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Header level={2} className="text-center mb-6">User Profile</Header>

        <Card className="flex flex-col md:flex-row items-center gap-6 p-6">
          <img
            src={user.profilePicture || '/default-avatar.png'}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border"
          />
          <div className="flex-1 space-y-2">
            <p><strong>Name:</strong> {user.name || 'N/A'}</p>
            <p><strong>Address:</strong> {user.address || 'Not set'}</p>
            <p><strong>Total Distance:</strong> {stats.distanceKm.toFixed(1)} km</p>
            <p><strong>Total Elevation:</strong> {stats.elevationM.toFixed(0)} m</p>
          </div>
        </Card>

        <Header level={3} className="mt-10 mb-4 text-xl font-semibold">Saved Routes</Header>

        {routes.length === 0 ? (
          <p className="text-gray-600">No routes saved yet.</p>
        ) : (
          <ul className="space-y-4">
            {routes.map((route, idx) => {
              const start = route.waypoints[0];
              const end = route.waypoints[route.waypoints.length - 1];

              return (
                <li key={route.id || idx} className="border border-gray-200 rounded p-4 bg-white shadow-sm">
                  <p className="font-semibold">{route.routeName || 'Unnamed Route'}</p>
                  <p className="text-sm text-gray-700">
                    From: {start.lat.toFixed(4)}, {start.lon.toFixed(4)}
                  </p>
                  <p className="text-sm text-gray-700">
                    To: {end.lat.toFixed(4)}, {end.lon.toFixed(4)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
