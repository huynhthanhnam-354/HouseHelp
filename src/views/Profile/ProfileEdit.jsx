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

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format member since date
  const formatMemberSince = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 p-6">
              {/* Avatar and Name */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {getInitials(profileData?.fullName)}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{profileData?.fullName || "N/A"}</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full capitalize">
                    {user?.role || "Customer"}
                  </span>
                  {user?.role === "housekeeper" && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      Senior
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">{user?.email || "N/A"}</span>
                </div>
                
                <div className="flex items-center gap-3 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm">{profileData?.phone || "N/A"}</span>
                </div>

                <div className="flex items-center gap-3 text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">{profileData?.address || "N/A"}</span>
                </div>
              </div>

              {/* Edit Profile Button */}
              <button
                type="button"
                onClick={onCancel}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium mb-6"
              >
                Edit Profile
              </button>

              {/* Quick Stats - Only for Housekeeper */}
              {user?.role === "housekeeper" && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rating</span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-semibold">4.8</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Jobs Completed</span>
                      <span className="text-sm font-semibold">127</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Hourly Rate</span>
                      <span className="text-sm font-semibold text-green-600">
                        ${profileData?.housekeeper?.price || 25}/hr
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button className="px-6 py-4 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
                    Personal Info
                  </button>
                  <button className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Booking History
                  </button>
                  {user?.role === "housekeeper" && (
                    <button className="px-6 py-4 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                      Statistics
                    </button>
                  )}
                </nav>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                        placeholder="Your email address"
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
                        placeholder="Enter your phone number"
                      />
                    </div>

                    {user?.role === "housekeeper" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hourly Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            min="0"
                            step="1"
                            className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="25"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">/hr</span>
                        </div>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full address"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell us about your experience and what makes you special..."
                      />
                    </div>

                    {user?.role === "housekeeper" && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Services Offered
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            Cleaning
                          </span>
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            Cooking
                          </span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                            Laundry
                          </span>
                        </div>
                        <input
                          type="text"
                          name="services"
                          value={formData.services}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter services you offer (comma separated)"
                        />
                      </div>
                    )}
                  </div>

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
        </div>
      </div>
    </div>
  );
}

export default ProfileEdit;