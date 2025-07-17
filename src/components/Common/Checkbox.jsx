import React from "react";

export default function Checkbox({ label, checked, onChange, required, ...props }) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        required={required}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
} 