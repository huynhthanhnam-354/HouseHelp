import React, { useState } from "react";

function ProfileEdit({ user, profileData, onCancel, onSave }) {
  const [formData, setFormData] = useState({
    // User fields
    fullName: profileData?.fullName || "",
    phone: profileData?.phone || "",
    dateOfBirth: profileData?.dateOfBirth || "",
    gender: profileData?.gender || "",
    address: profileData?.address || "",
    city: profileData?.city || "",
    district: profileData?.district || "",
    bio: profileData?.bio || "",
    languages: profileData?.languages || "",
    emergencyContact: profileData?.emergencyContact || "",
    emergencyContactName: profileData?.emergencyContactName || "",
    
    // Housekeeper fields (if applicable)
    ...(user?.role === "housekeeper" && {
      description: profileData?.housekeeper?.description || "",
      experience: profileData?.housekeeper?.experience || "",
      price: profileData?.housekeeper?.price || "",
      priceType: profileData?.housekeeper?.priceType || "hourly",
      workingHours: profileData?.housekeeper?.workingHours || "",
      serviceRadius: profileData?.housekeeper?.serviceRadius || 10,
      services: profileData?.housekeeper?.services || "",
      skills: "",
      certifications: "",
      hasInsurance: false
    })
  });

  const [loading, setLoading] = useState(false);
  const [fileUploads, setFileUploads] = useState({
    idCardFront: null,
    idCardBack: null
  });
  const [filePreviews, setFilePreviews] = useState({
    idCardFront: null,
    idCardBack: null
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (fieldName, file) => {
    if (file) {
      // Check file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB. Please choose a smaller image.');
        return;
      }

      setFileUploads(prev => ({
        ...prev,
        [fieldName]: file
      }));

      try {
        // Compress image for preview and storage
        const compressedImage = await compressImage(file);
        setFilePreviews(prev => ({
          ...prev,
          [fieldName]: compressedImage
        }));
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original file reader
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => ({
            ...prev,
            [fieldName]: e.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const triggerFileInput = (fieldName) => {
    const input = document.getElementById(fieldName);
    if (input) {
      input.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Format date to YYYY-MM-DD for SQL
      const formatDateForSQL = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // Get only YYYY-MM-DD part
      };

      const updateData = {
        user: {
          fullName: formData.fullName,
          phone: formData.phone,
          dateOfBirth: formatDateForSQL(formData.dateOfBirth),
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          bio: formData.bio,
          languages: formData.languages,
          emergencyContact: formData.emergencyContact,
          emergencyContactName: formData.emergencyContactName,
          // Store base64 image data for now (in production you'd upload to cloud storage)
          idCardFront: filePreviews.idCardFront || null,
          idCardBack: filePreviews.idCardBack || null,
        }
      };

      if (user?.role === "housekeeper") {
        updateData.housekeeper = {
          description: formData.description,
          experience: parseInt(formData.experience) || 0,
          price: parseFloat(formData.price) || 0,
          priceType: formData.priceType,
          workingHours: formData.workingHours,
          serviceRadius: parseInt(formData.serviceRadius) || 10,
          services: formData.services,
          skills: formData.skills,
          certifications: formData.certifications,
          hasInsurance: formData.hasInsurance,
        };
      }

      await onSave(updateData);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-container bg-gray-50">
      <div className="w-full h-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="lg:col-span-2 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages
                  </label>
                  <input
                    type="text"
                    name="languages"
                    value={formData.languages}
                    onChange={handleChange}
                    placeholder="e.g., Tiếng Việt, English"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="lg:col-span-2 xl:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

                        {/* Housekeeper Information */}
            {user?.role === "housekeeper" && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 xl:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (VNĐ)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Type
                    </label>
                    <select
                      name="priceType"
                      value={formData.priceType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hourly">Per Hour</option>
                      <option value="daily">Per Day</option>
                      <option value="per_service">Per Service</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Working Hours
                    </label>
                    <input
                      type="text"
                      name="workingHours"
                      value={formData.workingHours}
                      onChange={handleChange}
                      placeholder="e.g., 08:00-17:00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Radius (km)
                    </label>
                    <input
                      type="number"
                      name="serviceRadius"
                      value={formData.serviceRadius}
                      onChange={handleChange}
                      min="1"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="lg:col-span-2 xl:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Services Offered
                    </label>
                    <input
                      type="text"
                      name="services"
                      value={formData.services}
                      onChange={handleChange}
                      placeholder="e.g., Vệ sinh nhà cửa, Giặt ủi, Nấu ăn"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* ID Card Upload Section */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Verification Documents</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Card (Front) *
                      </label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => triggerFileInput('idCardFront')}
                      >
                        {filePreviews.idCardFront ? (
                          <div className="space-y-2">
                            <img 
                              src={filePreviews.idCardFront} 
                              alt="ID Card Front Preview" 
                              className="mx-auto h-24 w-auto rounded border"
                            />
                            <p className="text-sm text-green-600 font-medium">✓ File uploaded</p>
                            <p className="text-xs text-gray-500">Click to change</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600 hover:text-blue-500">
                                Click to upload
                              </span> or drag and drop
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB (auto-compressed)</p>
                          </div>
                        )}
                        <input 
                          id="idCardFront"
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handleFileChange('idCardFront', e.target.files[0])}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Card (Back) *
                      </label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => triggerFileInput('idCardBack')}
                      >
                        {filePreviews.idCardBack ? (
                          <div className="space-y-2">
                            <img 
                              src={filePreviews.idCardBack} 
                              alt="ID Card Back Preview" 
                              className="mx-auto h-24 w-auto rounded border"
                            />
                            <p className="text-sm text-green-600 font-medium">✓ File uploaded</p>
                            <p className="text-xs text-gray-500">Click to change</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600 hover:text-blue-500">
                                Click to upload
                              </span> or drag and drop
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB (auto-compressed)</p>
                          </div>
                        )}
                        <input 
                          id="idCardBack"
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handleFileChange('idCardBack', e.target.files[0])}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills & Certifications */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Skills & Certifications</h4>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Professional Skills
                      </label>
                      <textarea
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="e.g., Vệ sinh chuyên nghiệp, Nấu ăn ngon, Chăm sóc trẻ em..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certifications
                      </label>
                      <textarea
                        name="certifications"
                        value={formData.certifications}
                        onChange={handleChange}
                        placeholder="e.g., Chứng chỉ vệ sinh an toàn thực phẩm, Chứng chỉ sơ cấp cứu..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">List your professional certifications</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="hasInsurance"
                        name="hasInsurance"
                        checked={formData.hasInsurance}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="hasInsurance" className="text-sm font-medium text-gray-700">
                        I have professional insurance coverage
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileEdit; 