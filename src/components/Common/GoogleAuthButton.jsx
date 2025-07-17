import React from "react";

export default function GoogleAuthButton({ onClick }) {
  return (
    <button className="google-auth-btn" onClick={onClick} type="button">
      <span className="google-icon">G</span> Continue with Google
    </button>
  );
} 