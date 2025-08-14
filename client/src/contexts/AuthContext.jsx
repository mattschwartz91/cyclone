import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
const API_URL = "http://localhost:3000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = unknown or logged out

  // Check session status on app load
  useEffect(() => {
    fetch(`${API_URL}/api/status`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          setUser({ username: data.username });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, []);

  // Register new user (no auto-login)
  const register = async (username, password, passwordConf) => {
    const res = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, passwordConf }),
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
      setUser({ username: data.username });
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

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
