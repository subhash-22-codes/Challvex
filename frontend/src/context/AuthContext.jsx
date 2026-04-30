/* eslint-disable react/prop-types */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";

// Importing the organization logic from your client
import { getMyOrganizations } from "../api/client";

const AuthContext = createContext();

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    const now = Math.floor(
      Date.now() / 1000
    );

    return payload.exp < now;
  } catch {
    return true;
  }
}

export const AuthProvider = ({
  children
}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // New State for Organizations
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);

  /**
   * Fetches organizations and handles persistence 
   * for the currently active organization.
   */
  const fetchUserOrganizations = useCallback(async () => {
    try {
      const data = await getMyOrganizations();
      setOrganizations(data);

      // Check if user had a previously active organization saved
      const savedOrgId = localStorage.getItem("activeOrgId");
        if (savedOrgId) {
          const matched = data.find((o) => o.id === savedOrgId);
          if (matched) {
            setCurrentOrg(matched);
          } else {
            // If the Org no longer exists or they aren't a member anymore, clear the stale ID
            localStorage.removeItem("activeOrgId");
            setCurrentOrg(null);
          }
        }
      } catch (error) {
      console.error("Organization fetch failed:", error.message);
    }
  }, []);

  /**
   * Switches the active organization context
   */
  const switchOrg = (org) => {
    setCurrentOrg(org);
    if (org) {
      localStorage.setItem("activeOrgId", org.id);
    } else {
      localStorage.removeItem("activeOrgId");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeOrgId");

    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
  };

  const login = async (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
    
    // Fetch organizations immediately upon login
    await fetchUserOrganizations();
  };

  // Initial Auth & Data Loading
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (savedUser && token) {
        if (isTokenExpired(token)) {
          logout();
        } else {
          try {
            setUser(JSON.parse(savedUser));
            // Fetch organizations if token is valid
            await fetchUserOrganizations();
          } catch {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [fetchUserOrganizations]);

  /* Listen global logout event */
  useEffect(() => {
    const handleLogout = () => logout();

    window.addEventListener(
      "auth-logout",
      handleLogout
    );

    return () => {
      window.removeEventListener(
        "auth-logout",
        handleLogout
      );
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        switchOrg,
        login,
        logout,
        loading,
        refreshOrgs: fetchUserOrganizations // Exported for manual refreshes
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);