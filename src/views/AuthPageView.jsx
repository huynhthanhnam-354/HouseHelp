import React from "react";
import AuthTabs from "./Auth/AuthTabs";
import LoginForm from "./Auth/LoginForm";
import RegisterCustomerForm from "./Auth/RegisterCustomerForm";
import RegisterHousekeeperForm from "./Auth/RegisterHousekeeperForm";

export default function AuthPageView({ mode }) {
  return (
    <div className="auth-page-layout">
      <div className="auth-left-panel">
        <h1>HouseHelp</h1>
        <div className="welcome-illustration">Welcome Illustration</div>
        <h2>Welcome to HouseHelp</h2>
        <p>Connect with trusted housekeepers in your area. Quality service, verified professionals, and peace of mind - all in one platform.</p>
        <ul>
          <li>Verified & Background Checked</li>
          <li>Secure & Insured Services</li>
          <li>24/7 Customer Support</li>
        </ul>
      </div>
      <div className="auth-right-panel">
        <AuthTabs defaultTab={mode} />
      </div>
    </div>
  );
} 