import React from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Header({ keyword, setKeyword, onSearch }) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  
  const handleLogin = () => navigate("/login");
  const handleRegister = () => navigate("/register");
  const handleLogout = () => {
    logout();
  };
  
  // Generate user initials
  const getUserInitials = (fullName) => {
    if (!fullName) return "U";
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <header className="main-header">
      <div className="header-left">
        <span className="logo-text">HouseHelp</span>
      </div>
      <div className="header-center">
        <input
          className="search-input"
          placeholder="Search for housekeepers, services, or locations..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onSearch(); }}
        />
        <button className="search-btn" onClick={onSearch}>Search</button>
      </div>
      <div className="header-right">
        {isAuthenticated ? (
          <div className="header-user-section">
            <div className="header-avatar" title={user?.fullName}>
              {getUserInitials(user?.fullName)}
            </div>
            <button className="header-logout" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <>
            <button className="header-login" onClick={handleLogin}>Login</button>
            <button className="header-register" onClick={handleRegister}>Register</button>
          </>
        )}
      </div>
    </header>
  );
}
