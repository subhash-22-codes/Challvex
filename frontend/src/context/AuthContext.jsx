/* eslint-disable react/prop-types */
import {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";

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
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const logout = () => {
    localStorage.removeItem(
      "token"
    );
    localStorage.removeItem(
      "user"
    );

    setUser(null);
  };

  const login = (
    userData,
    token
  ) => {
    localStorage.setItem(
      "token",
      token
    );

    localStorage.setItem(
      "user",
      JSON.stringify(
        userData
      )
    );

    setUser(userData);
  };

  useEffect(() => {
    const savedUser =
      localStorage.getItem(
        "user"
      );

    const token =
      localStorage.getItem(
        "token"
      );

    if (savedUser && token) {
      if (
        isTokenExpired(token)
      ) {
        logout();
      } else {
        try {
          setUser(
            JSON.parse(
              savedUser
            )
          );
        } catch {
          logout();
        }
      }
    }

    setLoading(false);
  }, []);

  /* Listen global logout event */
  useEffect(() => {
    const handleLogout = () =>
      logout();

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
        login,
        logout,
        loading
      }}
    >
      {!loading &&
        children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);