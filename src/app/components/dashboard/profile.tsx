import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Phone, Mail, Bell } from 'lucide-react';

interface NotificationPreferences {
  notificationType: 'email' | 'mobile' | 'both';
  phoneNumber?: string;
}

const ProfilePage: React.FC = () => {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const [userData, setUserData] = useState<any>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    notificationType: 'email',
    phoneNumber: ''
  });
  const [profileData, setProfileData] = useState({
    displayName: '',
    username: '',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setProfileData({
              displayName: data.displayName || '',
              username: data.username || '',
            });
            
            // Set notification preferences
            setNotificationPrefs({
              notificationType: data.notificationType || 'email',
              phoneNumber: data.phoneNumber || ''
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user, db]);

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate phone number if mobile or both notifications are selected
    if ((notificationPrefs.notificationType === 'mobile' || notificationPrefs.notificationType === 'both') 
        && (!notificationPrefs.phoneNumber || notificationPrefs.phoneNumber.length < 10)) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: profileData.displayName,
        username: profileData.username,
        notificationType: notificationPrefs.notificationType,
        phoneNumber: notificationPrefs.phoneNumber || null
      });

      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('Failed to update profile');
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    setNotificationPrefs(prev => ({
      ...prev,
      phoneNumber: value
    }));
  };

  if (!user) {
    return <div className="p-6 text-white">Please log in to view your profile</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800/50 rounded-lg">
      <div className="flex items-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl mr-4">
          {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user.displayName || user.email?.split('@')[0]}
          </h1>
          <p className="text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Details */}
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <User className="mr-2 text-blue-400" /> Profile Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-1">Display Name</label>
              <input 
                type="text" 
                value={profileData.displayName}
                onChange={(e) => setProfileData(prev => ({...prev, displayName: e.target.value}))}
                className="w-full bg-gray-700 text-white rounded-md p-2"
                placeholder="Enter display name"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Username</label>
              <input 
                type="text" 
                value={profileData.username}
                onChange={(e) => setProfileData(prev => ({...prev, username: e.target.value}))}
                className="w-full bg-gray-700 text-white rounded-md p-2"
                placeholder="Choose a username"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Bell className="mr-2 text-blue-400" /> Notification Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">
                Select Notification Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'email', label: 'Email Only', icon: Mail },
                  { value: 'mobile', label: 'Mobile Only', icon: Phone },
                  { value: 'both', label: 'Both', icon: () => (
                    <div className="flex">
                      <Mail className="mr-1" />
                      <Phone />
                    </div>
                  ) }
                ].map(({ value, label, icon: Icon }) => (
                  <label 
                    key={value} 
                    className={`
                      flex items-center justify-center p-3 rounded-lg cursor-pointer 
                      border transition-colors
                      ${notificationPrefs.notificationType === value 
                        ? 'bg-blue-600/30 border-blue-500' 
                        : 'bg-gray-700 border-transparent hover:bg-gray-600/50'}
                    `}
                  >
                    <input 
                      type="radio" 
                      name="notificationType"
                      value={value}
                      checked={notificationPrefs.notificationType === value}
                      onChange={() => setNotificationPrefs(prev => ({
                        ...prev, 
                        notificationType: value as 'email' | 'mobile' | 'both'
                      }))}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center">
                      <Icon className="mb-1 text-white/70" size={24} />
                      <span className="text-sm text-white">{label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {(notificationPrefs.notificationType === 'mobile' || 
              notificationPrefs.notificationType === 'both') && (
              <div>
                <label className="block text-gray-300 mb-1 flex items-center">
                  <Phone className="mr-2 text-gray-400" />
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  value={notificationPrefs.phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="w-full bg-gray-700 text-white rounded-md p-2"
                  placeholder="Enter phone number (e.g., 1234567890)"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Please enter your phone number with country code (without + or spaces)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button 
            onClick={handleSaveProfile}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;