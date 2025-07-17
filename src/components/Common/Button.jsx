import React from "react";

export default function Button({ type = "button", children, onClick, fullWidth, ...props }) {
  return (
    <button
      type={type}
      className={fullWidth ? "btn full-width" : "btn"}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
} 