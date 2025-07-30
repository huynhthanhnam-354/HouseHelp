import React from "react";
import { useNavigate } from "react-router-dom";

function ProfileHeader({ user, profileData, onEdit }) {
  const navigate = useNavigate();
  // Generate user initials
  const getUserInitials = (fullName) => {
    if (!fullName) return "U";
    return fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 relative">
      {/* Close Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 right-4 profile-close-btn"
        title="Close Profile"
      >
        ×
      </button>
      
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-8">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profileData?.avatar ? (
            <img
              src={profileData.avatar}
              alt={user?.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold border-4 border-gray-100">
              {getUserInitials(profileData?.fullName || user?.fullName)}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {profileData?.fullName || user?.fullName || "Chưa cập nhật"}
          </h1>
          <p className="text-blue-600 font-medium mb-3 capitalize">
            {user?.role === 'housekeeper' ? 'Housekeeper' : 'Customer'}
            {profileData?.isVerified && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Verified
              </span>
            )}
          </p>
          
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>📧</span>
              <span>{profileData?.email || user?.email || "Chưa cập nhật"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📱</span>
              <span>{profileData?.phone || "Chưa cập nhật"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>
                {profileData?.address ? 
                  `${profileData.address}, ${profileData.district}, ${profileData.city}` : 
                  "Chưa cập nhật"
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>Member Since: {formatDate(profileData?.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        <div className="flex-shrink-0">
          <button
            onClick={onEdit}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader; 