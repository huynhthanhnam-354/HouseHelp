import React from "react";
import { useNavigate } from "react-router-dom";

export default function Header({ keyword, setKeyword, onSearch }) {
  const navigate = useNavigate();
  const handleLogin = () => navigate("/login");
  const handleRegister = () => navigate("/register");
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
        <button className="header-login" onClick={handleLogin}>Login</button>
        <button className="header-register" onClick={handleRegister}>Register</button>
      </div>
    </header>
  );
}
