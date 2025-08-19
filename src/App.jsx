import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./controllers/AuthPageController";
import HomePage from "./controllers/HomePageController";
import ProfilePage from "./pages/ProfilePage";
import BookingDetailPage from "./pages/BookingDetailPage";
import HousekeeperDashboard from "./pages/HousekeeperDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import SettingLanguage from "./views/Setting/SettingLanguage";
import { LanguageProvider } from "./contexts/LanguageContext";
import { BookingProvider } from "./contexts/BookingContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ToastContainer from "./components/ToastContainer";
import DebugNotification from "./components/DebugNotification";
import TestNotification from "./components/TestNotification";
import DebugBookingFlow from "./components/DebugBookingFlow";
import './App.css';

export default function App() {
  return (
    <LanguageProvider>
      <BookingProvider>
        <Router>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/booking/:housekeeperId" element={<BookingDetailPage />} />
              <Route path="/booking-detail/:bookingId" element={<BookingDetailPage />} />
              <Route path="/housekeeper/dashboard" element={<HousekeeperDashboard />} />
              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
              <Route path="/settings/language" element={<SettingLanguage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <ToastContainer />
            <DebugNotification />
            <TestNotification />
            <DebugBookingFlow />
          </NotificationProvider>
        </Router>
      </BookingProvider>
    </LanguageProvider>
  );
}
