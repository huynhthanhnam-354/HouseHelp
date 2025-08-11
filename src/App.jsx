import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./controllers/AuthPageController";
import HomePage from "./controllers/HomePageController";
import ProfilePage from "./pages/ProfilePage";
import SettingLanguage from "./views/Setting/SettingLanguage";
import { LanguageProvider } from "./contexts/LanguageContext";
import './App.css';

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings/language" element={<SettingLanguage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}
