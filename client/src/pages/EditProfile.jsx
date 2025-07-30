import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EditProfile() {

  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user'));
  if (!storedUser?.id) {
    navigate('/login');
    return;
  }

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser?.id) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      const res = await fetch(`/api/user/profile?userId=${storedUser.id}`);
      const data = await res.json();
      setName(data.name || '');
      setAddress(data.address || '');
    };

    fetchProfile();
  }, []);

  const [name, setName] = useState(storedUser.name || '');
  const [address, setAddress] = useState(storedUser.address || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const storedUser = JSON.parse(localStorage.getItem('user'));

    const updatedUser = {
      id: storedUser.id,
      name,
      address,
    };

    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser)
    });
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 p-2 rounded"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}