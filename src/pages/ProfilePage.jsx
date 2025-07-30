import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserProfile, updateUserProfile } from '../api/userApi';
import { getHousekeeperProfile, updateHousekeeperProfile } from '../api/housekeeperApi';
import ProfileView from '../views/ProfileView';

function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 LOADING PROFILE FROM DATABASE...');
      console.log('User ID:', user.id);
      
      // Load user profile from backend
      const profile = await getUserProfile(user.id);
      console.log('📥 Profile loaded from database:', profile);
      
      if (user.role === 'housekeeper') {
        try {
          const housekeeperProfile = await getHousekeeperProfile(user.id);
          console.log('📥 Housekeeper profile loaded:', housekeeperProfile);
          setProfileData({ ...profile, housekeeper: housekeeperProfile });
        } catch (error) {
          // If housekeeper profile not found, just use user profile
          console.warn('Housekeeper profile not found, using user data only');
          setProfileData(profile);
        }
      } else {
        setProfileData(profile);
      }
      
      console.log('✅ Profile data set successfully');
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      // Fallback to user data if API fails
      setProfileData(user);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updatedData) => {
    try {
      setLoading(true);
      
      console.log('=== FRONTEND UPDATE PROFILE ===');
      console.log('User:', user);
      console.log('User ID:', user.id);
      console.log('Update Data:', updatedData);
      
      // Update user profile
      console.log('Calling updateUserProfile with ID:', user.id);
      const userResult = await updateUserProfile(user.id, updatedData.user);
      console.log('User update result:', userResult);
      
      // Update housekeeper profile if applicable
      if (user.role === 'housekeeper' && updatedData.housekeeper) {
        console.log('Calling updateHousekeeperProfile with ID:', user.id);
        const housekeeperResult = await updateHousekeeperProfile(user.id, updatedData.housekeeper);
        console.log('Housekeeper update result:', housekeeperResult);
      }
      
      // Force reload profile data from backend
      console.log('🔄 Reloading profile data after update...');
      await loadProfile();
      setEditing(false);
      
      console.log('✅ Profile updated and reloaded successfully!');
      alert('Profile đã được cập nhật thành công!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Có lỗi xảy ra khi cập nhật profile. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
          <p className="text-gray-600">You need to login to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <ProfileView
      user={user}
      profileData={profileData}
      loading={loading}
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => setEditing(false)}
      onSave={handleUpdateProfile}
    />
  );
}

export default ProfilePage; 