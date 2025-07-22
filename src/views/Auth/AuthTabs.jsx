import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthTabs({ defaultTab }) {
  const [tab, setTab] = useState(defaultTab === "register" ? "register" : "login");

  return (
    <div className="auth-tabs">
      <div className="tab-buttons">
        <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>Login</button>
        <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>Register</button>
      </div>
      {tab === "login" && <LoginForm />}
      {tab === "register" && <RegisterForm />}
    </div>
  );
} 