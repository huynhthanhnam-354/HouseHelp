import React, { useState, useRef } from "react";

export default function UploadBox({ label, file, onChange, accept = ".png,.jpg,.jpeg", ...props }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (selectedFile) {
      // Validate file type
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
      
      if (!acceptedTypes.includes(fileExtension)) {
        alert(`Chỉ chấp nhận file: ${accept}`);
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.');
        return;
      }

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target.result);
        };
        reader.readAsDataURL(selectedFile);
      }

      onChange(selectedFile);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="upload-box" style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          marginBottom: '4px', 
          fontSize: '14px', 
          fontWeight: '500',
          color: '#333'
        }}>
          {label}
        </label>
      )}
      
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? '#007bff' : '#ddd'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: dragOver ? '#f8f9fa' : file ? '#f0f8ff' : '#fafafa',
          transition: 'all 0.2s ease',
          position: 'relative',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          style={{ display: 'none' }}
          {...props}
        />

        {preview ? (
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: '100px',
                maxHeight: '100px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
            <button
              type="button"
              onClick={handleRemove}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#dc3545',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        ) : file && typeof file === 'string' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '24px', 
              color: '#28a745', 
              marginBottom: '8px' 
            }}>
              ✓
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#666',
              wordBreak: 'break-all'
            }}>
              File đã upload: {file.split('/').pop()}
            </div>
          </div>
        ) : file ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '24px', 
              color: '#007bff', 
              marginBottom: '8px' 
            }}>
              📄
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#666',
              wordBreak: 'break-all'
            }}>
              {file.name}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#999',
              marginTop: '4px'
            }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '32px', 
              color: '#ccc', 
              marginBottom: '8px' 
            }}>
              📁
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#666',
              marginBottom: '4px'
            }}>
              Click để chọn file hoặc kéo thả vào đây
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#999' 
            }}>
              {accept.toUpperCase()} tối đa 10MB
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 