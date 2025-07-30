import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Header({ keyword, setKeyword, onSearch }) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  const handleLogin = () => navigate("/login");
  const handleRegister = () => navigate("/register");
  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };
  
  const handleProfile = () => {
    navigate("/profile");
    setShowDropdown(false);
  };
  
  const handleSettings = () => {
    navigate("/settings");
    setShowDropdown(false);
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
          <div className="header-user-section" ref={dropdownRef}>
            <div 
              className="header-avatar" 
              title={user?.fullName}
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ cursor: 'pointer' }}
            >
              {getUserInitials(user?.fullName)}
            </div>
            
            {showDropdown && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {getUserInitials(user?.fullName)}
                  </div>
                  <div className="dropdown-user-info">
                    <div className="dropdown-name">{user?.fullName}</div>
                    <div className="dropdown-role">{user?.role === 'housekeeper' ? 'Housekeeper' : 'Customer'}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item" onClick={handleProfile}>
                  <span className="dropdown-icon">👤</span>
                  Profile
                </button>
                <button className="dropdown-item" onClick={handleSettings}>
                  <span className="dropdown-icon">⚙️</span>
                  Settings
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogout}>
                  <span className="dropdown-icon">🚪</span>
                  Logout
                </button>
              </div>
            )}
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
