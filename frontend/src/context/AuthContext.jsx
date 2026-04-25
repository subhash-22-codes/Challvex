/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. On every page load/refresh, check if a session exists
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        // If data is corrupted, clear it
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  // 2. The Login Handler: Stores data and updates the state
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  // 3. The Logout Handler: Full system wipe
  // 3. The Logout Handler: Pure state wipe (Mobile Safe)
  const logout = () => {
    localStorage.removeItem('token');  
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {/* Don't render the app until we've checked if the user is logged in */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Hook for easy access in any component
export const useAuth = () => useContext(AuthContext);