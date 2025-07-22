import React, { useState } from "react";
import FilterSidebar from "./Housekeeper/FilterSidebar";
import HousekeeperList from "./Housekeeper/HousekeeperList";
import QuickInfo from "./Housekeeper/QuickInfo";
import SpecialOffer from "./Housekeeper/SpecialOffer";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const handleLogin = () => navigate("/login");
  const handleRegister = () => navigate("/register");
  return (
    <header className="main-header">
      <div className="header-left">
        <span className="logo-text">HouseHelp</span>
      </div>
      <div className="header-center">
        <input className="search-input" placeholder="Search for housekeepers, services, or locations..." />
        <button className="search-btn">Search</button>
      </div>
      <div className="header-right">
        <button className="header-login" onClick={handleLogin}>Login</button>
        <button className="header-register" onClick={handleRegister}>Register</button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-col">
        <div className="footer-title">Services</div>
        <div>House Cleaning</div>
        <div>Cooking</div>
        <div>Babysitting</div>
        <div>Elder Care</div>
      </div>
      <div className="footer-col">
        <div className="footer-title">Support</div>
        <div>Help Center</div>
        <div>Contact Us</div>
        <div>Insurance</div>
      </div>
      <div className="footer-col">
        <div className="footer-title">Company</div>
        <div>About Us</div>
        <div>Careers</div>
        <div>News</div>
      </div>
      <div className="footer-col">
        <div className="footer-title">Legal</div>
        <div>Terms of Service</div>
        <div>Privacy Policy</div>
        <div>Cookie Policy</div>
        <div>Refund Policy</div>
      </div>
      <div className="footer-social">
        <span>Facebook</span>
        <span>Twitter</span>
        <span>Instagram</span>
        <span>LinkedIn</span>
      </div>
      <div className="footer-copy">© 2024 HouseHelp. All rights reserved.</div>
    </footer>
  );
}

export default function HomePageView() {
  const [filter, setFilter] = useState({});
  
  return (
    <div className="home-root">
      <Header />
      <div className="home-layout">
        <aside className="sidebar">
          <FilterSidebar onFilterChange={setFilter} />
        </aside>
        <main className="main-content">
          <HousekeeperList filter={filter} />
        </main>
        <aside className="rightbar">
          <QuickInfo />
          <SpecialOffer />
        </aside>
      </div>
      <Footer />
    </div>
  );
} 