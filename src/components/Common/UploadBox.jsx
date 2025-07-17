import React from "react";

export default function UploadBox({ label, file, onChange, accept = ".png,.jpg,.jpeg", ...props }) {
  const handleFile = e => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };
  return (
    <div className="upload-box">
      {label && <label>{label}</label>}
      <input type="file" accept={accept} onChange={handleFile} {...props} />
      {file && <div className="file-name">{file.name}</div>}
      {!file && <div className="upload-placeholder">Click to upload or drag and drop<br />PNG, JPG up to 10MB</div>}
    </div>
  );
} 