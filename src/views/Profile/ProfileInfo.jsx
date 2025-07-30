import React, { useState } from "react";

function ProfileInfo({ user, profileData }) {
  const [activeTab, setActiveTab] = useState("personal");

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const personalInfo = [
    { label: "First Name", value: profileData?.fullName?.split(' ')[0] || "Chưa cập nhật" },
    { label: "Last Name", value: profileData?.fullName?.split(' ').slice(1).join(' ') || "Chưa cập nhật" },
    { label: "Email Address", value: profileData?.email || user?.email || "Chưa cập nhật" },
    { label: "Phone Number", value: profileData?.phone || "Chưa cập nhật" },
    { label: "Address", value: profileData?.address || "Chưa cập nhật" },
    { label: "City", value: profileData?.city || "Chưa cập nhật" },
    { label: "District", value: profileData?.district || "Chưa cập nhật" },
    { label: "Date of Birth", value: formatDate(profileData?.dateOfBirth) },
    { label: "Gender", value: profileData?.gender ? (profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)) : "Chưa cập nhật" },
    { label: "Languages", value: profileData?.languages || "Chưa cập nhật" },
    { label: "Bio", value: profileData?.bio || "Chưa cập nhật" },
    { label: "Emergency Contact", value: profileData?.emergencyContact || "Chưa cập nhật" },
    { label: "Emergency Contact Name", value: profileData?.emergencyContactName || "Chưa cập nhật" },
  ];

  const idCardImages = [
    { label: "ID Card (Front)", value: profileData?.idCardFront },
    { label: "ID Card (Back)", value: profileData?.idCardBack },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab("personal")}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "personal"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab("booking")}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "booking"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Booking History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "personal" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {personalInfo.map((info, index) => (
                <div key={index} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    {info.label}
                  </label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
                    {info.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ID Card Section */}
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Verification Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {idCardImages.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">{item.label}</h5>
                    {item.value ? (
                      <div className="border rounded-lg p-2 bg-gray-50">
                        <img 
                          src={item.value} 
                          alt={item.label}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <p className="text-xs text-green-600 mt-2 text-center">✓ Uploaded</p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center bg-gray-50">
                        <p className="text-sm text-gray-500">Not uploaded yet</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "booking" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Booking History</h3>
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">📋</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Bookings Yet</h4>
              <p className="text-gray-600">
                {user?.role === "customer" 
                  ? "You haven't booked any services yet. Start exploring our housekeepers!"
                  : "You haven't received any bookings yet. Keep your profile updated to attract customers!"
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileInfo; 