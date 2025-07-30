import React from "react";
import ProfileHeader from "./Profile/ProfileHeader";
import ProfileInfo from "./Profile/ProfileInfo";
import HousekeeperInfo from "./Profile/HousekeeperInfo";
import ProfileEdit from "./Profile/ProfileEdit";

function ProfileView({ user, profileData, loading, editing, onEdit, onCancel, onSave }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Đang tải thông tin profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg text-red-500">Không thể tải thông tin profile</div>
      </div>
    );
  }

  if (editing) {
    return (
      <ProfileEdit
        user={user}
        profileData={profileData}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
  }

  return (
    <div className="profile-page-container bg-gray-50">
      <div className="w-full h-full px-4 py-6">
        <ProfileHeader user={user} profileData={profileData} onEdit={onEdit} />
        
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6 mt-6">
          <div className="xl:col-span-3 lg:col-span-2">
            <ProfileInfo user={user} profileData={profileData} />
          </div>
          
          <div className="xl:col-span-1 lg:col-span-1">
            {user.role === "housekeeper" && profileData.housekeeper && (
              <HousekeeperInfo housekeeperData={profileData.housekeeper} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileView; 