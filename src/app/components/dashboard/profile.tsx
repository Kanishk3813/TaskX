import React, { useState, useEffect } from 'react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Phone, Mail, Bell, ArrowLeft, Save, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

interface NotificationPreferences {
  notificationType: 'email' | 'mobile' | 'both';
  phoneNumber?: string;
}

interface ProfilePageProps {
  onBack?: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onBack }) => {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    notificationType: 'email',
    phoneNumber: ''
  });
  const [profileData, setProfileData] = useState({
    displayName: '',
    username: '',
  });
  
  // Password change states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Section visibility states
  const [showProfileSection, setShowProfileSection] = useState(true);
  const [showNotificationSection, setShowNotificationSection] = useState(true);
  const [showPasswordChangeSection, setShowPasswordChangeSection] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          setLoading(true);
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setProfileData({
              displayName: data.displayName || user.displayName || '',
              username: data.username || '',
            });
            
            // Set notification preferences
            setNotificationPrefs({
              notificationType: data.notificationType || 'email',
              phoneNumber: data.phoneNumber || ''
            });
          } else {
            // Initialize with Firebase auth data if no Firestore data exists
            setProfileData({
              displayName: user.displayName || '',
              username: '',
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
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
      showNotification('Please enter a valid phone number', 'error');
      return;
    }

    try {
      setSaving(true);
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: profileData.displayName,
        username: profileData.username,
        notificationType: notificationPrefs.notificationType,
        phoneNumber: notificationPrefs.phoneNumber || null
      });

      showNotification('Profile updated successfully!', 'success');
    } catch (error) {
      console.error("Error updating profile:", error);
      showNotification('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl text-white flex items-center ${
      type === 'success' ? 'bg-blue-500' : 'bg-red-500'
    }`;
    
    const icon = document.createElement('div');
    icon.className = 'mr-3';
    icon.innerHTML = type === 'success' 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    const text = document.createElement('span');
    text.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(text);
    document.body.appendChild(notification);
    
    notification.style.transform = 'translateY(20px)';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease';
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
      notification.style.opacity = '1';
    }, 10);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateY(20px)';
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digit characters
    setNotificationPrefs(prev => ({
      ...prev,
      phoneNumber: value
    }));
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    try {
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email || '',
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      // Clear fields and show success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully');
      
      // Close password section after success
      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess('');
      }, 2000);
      
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else {
        setPasswordError('Failed to update password. Please try again later.');
      }
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-black/40 backdrop-blur-sm rounded-lg text-center">
        <h2 className="text-xl text-white mb-4">Please log in to view your profile</h2>
        <button 
          onClick={onBack}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-black/40 backdrop-blur-sm rounded-lg flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 p-0 bg-transparent">
      <div className="flex items-center mt-4 mb-8 px-4">
        <button 
          onClick={onBack}
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} className="mr-1" />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="flex items-center p-6 bg-black/30 backdrop-blur-md rounded-xl mb-6 shadow-lg">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-4xl shadow-md">
            {profileData.displayName ? profileData.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="ml-5">
          <h1 className="text-2xl font-bold text-white">{profileData.displayName || 'Your Account'}</h1>
          <p className="text-gray-400">
            {user.email}
            {profileData.username && <span> • @{profileData.username}</span>}
          </p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="mb-6 bg-black/30 backdrop-blur-md rounded-xl overflow-hidden shadow-lg">
        <div 
          className="px-6 py-4 border-b border-gray-800 flex items-center justify-between cursor-pointer"
          onClick={() => setShowProfileSection(!showProfileSection)}
        >
          <div className="flex items-center">
            <User className="text-blue-400 mr-3" size={20} />
            <h2 className="text-lg font-medium text-white">Profile Information</h2>
          </div>
          {showProfileSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
        
        {showProfileSection && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Display Name</label>
              <input 
                type="text" 
                value={profileData.displayName}
                onChange={(e) => setProfileData(prev => ({...prev, displayName: e.target.value}))}
                className="w-full bg-gray-800/70 text-white rounded-lg p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">@</span>
                <input 
                  type="text" 
                  value={profileData.username}
                  onChange={(e) => setProfileData(prev => ({...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '-')}))}
                  className="w-full bg-gray-800/70 text-white rounded-lg p-3 pl-8 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  placeholder="username"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                taskx.com/{profileData.username || 'username'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Password Section */}
      <div className="mb-6 bg-black/30 backdrop-blur-md rounded-xl overflow-hidden shadow-lg">
        <div 
          className="px-6 py-4 border-b border-gray-800 flex items-center justify-between cursor-pointer"
          onClick={() => setShowPasswordChangeSection(!showPasswordChangeSection)}
        >
          <div className="flex items-center">
            <Lock className="text-blue-400 mr-3" size={20} />
            <h2 className="text-lg font-medium text-white">Security</h2>
          </div>
          {showPasswordChangeSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
        
        {showPasswordChangeSection && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-medium">Password</h3>
                <p className="text-gray-500 text-sm">Change your account password</p>
              </div>
              <button 
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
              >
                {showPasswordSection ? 'Cancel' : 'Change'}
              </button>
            </div>
            
            {showPasswordSection && (
              <div className="mt-5 space-y-4">
                {passwordError && (
                  <div className="bg-red-900/30 border border-red-900 text-red-200 p-3 rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}
                
                {passwordSuccess && (
                  <div className="bg-green-900/30 border border-green-900 text-green-200 p-3 rounded-lg text-sm">
                    {passwordSuccess}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                  <div className="relative">
                    <input 
                      type={showCurrentPassword ? "text" : "password"} 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-gray-800/70 text-white rounded-lg p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10 transition-all"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">New Password</label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-800/70 text-white rounded-lg p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10 transition-all"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-800/70 text-white rounded-lg p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                
                <button 
                  onClick={handlePasswordChange}
                  className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition-colors"
                >
                  Update Password
                </button>
                
                <p className="text-xs text-gray-500 mt-2">
                  Password must be at least 8 characters long.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="mb-6 bg-black/30 backdrop-blur-md rounded-xl overflow-hidden shadow-lg">
        <div 
          className="px-6 py-4 border-b border-gray-800 flex items-center justify-between cursor-pointer"
          onClick={() => setShowNotificationSection(!showNotificationSection)}
        >
          <div className="flex items-center">
            <Bell className="text-blue-400 mr-3" size={20} />
            <h2 className="text-lg font-medium text-white">Notifications</h2>
          </div>
          {showNotificationSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
        
        {showNotificationSection && (
          <div className="p-6">
            <p className="text-gray-400 mb-5 text-sm">Choose how you want to receive notifications about your tasks and account updates.</p>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm text-gray-400">
                  Notification Method
                </label>
                
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'email', label: 'Email Only', icon: Mail, description: 'Get notified via email' },
                    { value: 'mobile', label: 'Mobile Only', icon: Phone, description: 'Get notified via SMS' },
                    { value: 'both', label: 'Email & Mobile', icon: Bell, description: 'Get notified via email and SMS' }
                  ].map(({ value, label, icon: Icon, description }) => (
                    <label 
                      key={value} 
                      className={`
                        flex items-center p-4 rounded-lg cursor-pointer transition-colors
                        ${notificationPrefs.notificationType === value 
                          ? 'bg-blue-500/20 border border-blue-500/50' 
                          : 'bg-gray-800/70 border border-transparent hover:bg-gray-700/70'}
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
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full ${notificationPrefs.notificationType === value ? 'bg-blue-500' : 'bg-gray-700'} flex items-center justify-center mr-4`}>
                          <Icon className="text-white" size={18} />
                        </div>
                        <div>
                          <div className="text-white font-medium">{label}</div>
                          <div className="text-gray-400 text-sm">{description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {(notificationPrefs.notificationType === 'mobile' || 
                notificationPrefs.notificationType === 'both') && (
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-2">Phone Number</label>
                  <input 
                    type="tel" 
                    value={notificationPrefs.phoneNumber}
                    onChange={handlePhoneNumberChange}
                    className="w-full bg-gray-800/70 text-white rounded-lg p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    placeholder="Enter your phone number"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Format: Country code followed by number (e.g., 16175551234)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-6 flex justify-end">
        <button 
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-8 rounded-lg shadow-lg flex items-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;