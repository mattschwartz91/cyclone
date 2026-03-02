import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/apiBase.js";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
// Prefer configured API base; otherwise use same-origin relative URLs.
const API_URL = API_BASE_URL || "";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out, object = logged in
  const [loading, setLoading] = useState(true);

  // Check session status on app load
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/status`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          fetch(`${API_URL}/api/user/profile`, { credentials: 'include' })
            .then((r) => r.ok ? r.json() : null)
            .then((profile) => {
              if (profile) {
                setUser(profile);
              } else {
                // fallback to any fields returned by /api/status
                const baseUser = {};
                if (data.name) baseUser.name = data.name;
                if (data.avatar) baseUser.avatar = data.avatar;
                setUser(baseUser);
              }
            })
            .catch(() => {
              const baseUser = {};
              if (data.name) baseUser.name = data.name;
              if (data.avatar) baseUser.avatar = data.avatar;
              setUser(baseUser);
            });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Register new user (no auto-login)
  const register = async (username, password, passwordConf, firstName, lastName) => {
    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, passwordConf, firstName, lastName }),
    });
    const data = await res.json();
    if (data.ok) {
      return { ok: true, message: data.message };
    }
    return { ok: false, message: data.message || "Registration failed" };
  };

  // Login user
  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.ok) {
      try {
        const profileRes = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUser(profile);
        } else {
          // fall back to response fields
          const baseUser = {};
          if (data.name) baseUser.name = data.name;
          if (data.avatar) baseUser.avatar = data.avatar;
          if (data.username) baseUser.username = data.username;
          setUser(baseUser);
        }
      } catch (e) {
        const baseUser = {};
        if (data.name) baseUser.name = data.name;
        if (data.avatar) baseUser.avatar = data.avatar;
        if (data.username) baseUser.username = data.username;
        setUser(baseUser);
      }
      return { ok: true, message: "Login succesful!", username };
    }
    return { ok: false, message: data.message || "Login failed" };
  };

  // Logout user
  const logout = async () => {
    const res = await fetch(`${API_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    
    const data = await res.json();
    if (data.ok) {
      setUser(null);
      return { ok: true, message: "Logout succesful!"};
    }

    return { ok: false, message: data.message || "Logout failed" };
    
  };

  // Refresh user data (useed for after profile updates)
  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, { credentials: 'include' });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
        return true;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
