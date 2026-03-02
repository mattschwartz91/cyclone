import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../utils/apiBase.js';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user: authUser, loading, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const formRef = useRef(null);

  useEffect(() => {
    if (!loading && !authUser) {
      navigate('/');
      return;
    }
  }, [authUser, loading, navigate]);

  useEffect(() => {
    if (!authUser) return;
    
    const fetchProfile = async () => {
      try {
        const base = API_BASE_URL || '';
        const res = await fetch(`${base}/api/user/profile`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setAddress(data.address || '');
          // Use profilePicture as primary, fallback to avatar
          const avatarUrl = data.profilePicture || data.avatar || '';
          if (avatarUrl && avatarUrl !== '/avatars/default-avatar.png' && !avatarUrl.startsWith('http')) {
            setAvatarPreview(`${base}${avatarUrl}`);
          } else {
            setAvatarPreview(avatarUrl || '/avatars/default-avatar.png');
          }
        } else if (res.status === 401) {
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, [authUser, navigate]);

  // Handle clicks outside the form
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        navigate('/profile');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!profile?.id) {
      setSubmitError('No profile ID available');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();
      formData.append('id', profile.id);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('address', address);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const base = API_BASE_URL || '';
      const res = await fetch(`${base}/api/user/profile/${profile.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });

      if (res.ok) {
        // Refresh user data in auth context so header updates immediately
        try {
          if (typeof refreshUser === 'function') {
            await refreshUser();
            console.log('User data refreshed successfully');
          } else {
            console.warn('refreshUser is not available');
          }
        } catch (refreshError) {
          console.error('Failed to refresh user data:', refreshError);
        }
        navigate('/profile');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        setSubmitError(`Failed to update profile: ${errorData.error || 'Server error'}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSubmitError(`Error updating profile: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg" ref={formRef}>
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      
      {submitError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {submitError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 p-2 rounded"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 p-2 rounded"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Avatar</label>
          {avatarPreview && (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="w-16 h-16 rounded-full mb-2 object-cover border"
            />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleAvatarChange}
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
            disabled={isSubmitting}
            className={`px-4 py-2 text-white rounded ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}