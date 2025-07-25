import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Force refresh trigger
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthState();
  }, [refreshTrigger]); // Re-check when refreshTrigger changes

  const checkAuthState = () => {
    try {
      const userData = localStorage.getItem("househelp_user");
      if (userData && userData !== "null" && userData !== "undefined") {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth state:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData) => {
    localStorage.setItem("househelp_user", JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh
  };

  const logout = () => {
    console.log("Logout called - clearing localStorage and state");
    localStorage.removeItem("househelp_user");
    setUser(null);
    setIsAuthenticated(false);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh for all instances
    navigate("/");
  };

  // Check authentication directly from localStorage to avoid state timing issues
  const isCurrentlyAuthenticated = () => {
    try {
      const userData = localStorage.getItem("househelp_user");
      return userData && userData !== "null" && userData !== "undefined";
    } catch (error) {
      console.error("Error checking current auth:", error);
      return false;
    }
  };

  const requireAuth = (redirectTo = "/login") => {
    const authStatus = isCurrentlyAuthenticated();
    console.log("RequireAuth check - authenticated:", authStatus);
    
    if (!authStatus) {
      console.log("Not authenticated, redirecting to:", redirectTo);
      navigate(redirectTo);
      return false;
    }
    return true;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    requireAuth,
    checkAuthState,
    isCurrentlyAuthenticated
  };
};

export default useAuth; 