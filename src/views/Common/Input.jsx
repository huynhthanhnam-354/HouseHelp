import React from "react";

export default function Input({ label, type = "text", value, onChange, placeholder, required, disabled, ...props }) {
  return (
    <div className="input-group">
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        {...props}
      />
    </div>
  );
} 