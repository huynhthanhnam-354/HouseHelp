import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./controllers/AuthPageController";
import HomePage from "./controllers/HomePageController";
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
