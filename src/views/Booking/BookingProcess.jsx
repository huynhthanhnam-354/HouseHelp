import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../hooks/useAuth";
import translations from "../../locales/translations";
import "./BookingProcess.css";

export default function BookingProcess({ housekeeper, booking }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = translations[language];

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(15);

  const steps = [
    { id: "availability", label: t.availability || "Availability", status: "completed" },
    { id: "payment", label: t.payment || "Payment", status: "completed" },
    { id: "confirmation", label: t.confirmation || "Confirmation", status: "active" },
    { id: "complete", label: t.complete || "Complete", status: "pending" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1;
        
        // Update current step based on progress
        if (newProgress < 25) {
          setCurrentStep(0);
          setEstimatedTime(15 - Math.floor(newProgress * 0.6));
        } else if (newProgress < 50) {
          setCurrentStep(1);
          setEstimatedTime(12 - Math.floor((newProgress - 25) * 0.48));
        } else if (newProgress < 80) {
          setCurrentStep(2);
          setEstimatedTime(8 - Math.floor((newProgress - 50) * 0.27));
        } else {
          setCurrentStep(3);
          setEstimatedTime(Math.max(0, 3 - Math.floor((newProgress - 80) * 0.15)));
        }

        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const getStepStatus = (index) => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "active";
    return "pending";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const generateBookingId = () => {
    return `HK-${Date.now().toString().slice(-6)}`;
  };

  return (
    <div className="booking-process-container">
      {/* Header */}
      <div className="process-header">
        <div className="header-content">
          <h1 className="process-title">{t.processingYourBooking || "Processing Your Booking"}</h1>
          <p className="process-subtitle">{t.pleaseWaitConfirm || "Please wait while we confirm your appointment"}</p>
        </div>
        <div className="booking-id-section">
          <span className="booking-id-label">{t.bookingID || "Booking ID"}</span>
          <span className="booking-id-value">{generateBookingId()}</span>
        </div>
      </div>

      {/* Progress Circle */}
      <div className="progress-section">
        <div className="progress-circle-container">
          <svg className="progress-circle" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#4285F4"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              className="progress-stroke"
            />
          </svg>
          <div className="progress-content">
            <span className="progress-percentage">{Math.floor(progress)}%</span>
            <span className="progress-label">{t.complete || "Complete"}</span>
          </div>
        </div>

        <div className="progress-status">
          <p className="status-text">{t.sendingConfirmation || "Sending confirmation..."}</p>
          <p className="time-remaining">
            {t.estimatedTimeRemaining || "Estimated time remaining"}: {estimatedTime} {t.seconds || "seconds"}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={step.id} className={`step-item ${getStepStatus(index)}`}>
            <div className="step-indicator">
              {getStepStatus(index) === "completed" ? (
                <svg className="step-check" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="step-number">{index + 1}</span>
              )}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Booking Details */}
      <div className="booking-details-section">
        <h3 className="details-title">{t.bookingDetails || "Booking Details"}</h3>
        
        <div className="details-grid">
          <div className="detail-item">
            <span className="detail-label">{t.service || "Service"}:</span>
            <span className="detail-value">{booking.service || "Hair Cut & Styling"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">{t.date || "Date"}:</span>
            <span className="detail-value">
              {booking.date ? formatDate(booking.date) : "Monday, January 15, 2024"}
            </span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">{t.time || "Time"}:</span>
            <span className="detail-value">{booking.time || "14:30"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">{t.duration || "Duration"}:</span>
            <span className="detail-value">{booking.duration || 60} {t.minutes || "minutes"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">{t.customer || "Customer"}:</span>
            <span className="detail-value">{booking?.customerName || user?.fullName || (user?.firstName + " " + user?.lastName) || "Customer"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">{t.email || "Email"}:</span>
            <span className="detail-value">{booking?.customerEmail || user?.email || "customer@example.com"}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">{t.phone || "Phone"}:</span>
            <span className="detail-value">{booking?.customerPhone || user?.phoneNumber || user?.phone || "+1 (555) 123-4567"}</span>
          </div>
          
          <div className="detail-item total-item">
            <span className="detail-label">{t.total || "Total"}:</span>
            <span className="detail-value price">
              ${booking?.totalPrice || ((housekeeper?.price || 25) * (booking?.duration || 2) + 10).toFixed(2)}
            </span>
          </div>
        </div>

        <button className="cancel-booking-btn">
          {t.cancelBooking || "Cancel Booking"}
        </button>
      </div>
    </div>
  );
}
