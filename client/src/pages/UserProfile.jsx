import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Header from '../components/ui/Header';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ distanceKm: 0, elevationM: 0 });

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(localUser);

    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/user/stats?userId=${localUser.id}`);
        const data = await res.json();
        if (res.ok) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load user stats', err);
      }
    };

    if (localUser?.id) {
      fetchStats();
    }
  }, []);

  const navigate = useNavigate();
useEffect(() => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    navigate('/login');
  }
}, []);

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
      </div>
    </div>
  );
}