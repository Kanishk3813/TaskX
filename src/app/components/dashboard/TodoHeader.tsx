import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, X, LogIn, LogOut, User, Settings, ChevronDown, CalendarCheck, BarChart2 } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface TodoHeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  user: any; 
  onLoginPage: boolean;
  setOnLoginPage: (value: boolean) => void;
  onNavigateToProfile: () => void;
  onNavigateToStats: () => void;
}

interface UserData {
  username?: string;
  displayName?: string;
  email: string;
  photoURL?: string | null;
}

const IntegrateModal = ({ onClose }: { onClose: () => void }) => {
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState('');
  const [integrationError, setIntegrationError] = useState('');
  const auth = getAuth();
  const db = getFirestore();

  const handleGoogleAuth = async () => {
    setIsIntegrating(true);
    setIntegrationError('');
    
    try {
      const clientId = '787997712321-mhs1p67s3djkq3nap4nr91lnjbiojvu7.apps.googleusercontent.com';
      const redirectUri = `${window.location.origin}/integrate`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;

      localStorage.setItem('taskx_redirect_after_auth', window.location.pathname);
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google auth failed:', error);
      setIntegrationStatus('');
      setIntegrationError('Failed to start Google authentication');
      setIsIntegrating(false);
    }
  };

  const checkExistingIntegration = async () => {
    if (!auth.currentUser) return;
    
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().googleTokens) {
        setIntegrationStatus('Connected to Google Calendar');
      }
    } catch (error) {
      console.error('Error checking integration status:', error);
      setIntegrationError('Could not check integration status');
    }
  };

  useEffect(() => {
    checkExistingIntegration();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Calendar Integration</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleGoogleAuth}
            disabled={isIntegrating}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            <CalendarCheck size={20} />
            <span>
              {isIntegrating ? 'Connecting...' : 'Connect Google Calendar'}
            </span>
          </button>

          {integrationStatus && (
            <div className="p-3 bg-gray-700/50 rounded-lg text-sm text-center">
              {integrationStatus}
            </div>
          )}

          <p className="text-sm text-gray-400 text-center">
            This will sync your tasks with Google Calendar including deadlines and recurring events.
          </p>
        </div>
      </div>
    </div>
  );
};

const TodoHeader: React.FC<TodoHeaderProps> = ({ 
  isMobileMenuOpen, 
  setIsMobileMenuOpen,
  user,
  onLoginPage,
  setOnLoginPage,
  onNavigateToProfile,
  onNavigateToStats
}) => {
  const auth = getAuth();
  const db = getFirestore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showIntegrateModal, setShowIntegrateModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);
          } else {
            setUserData({
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
        }
      } else {
        setUserData(null);
      }
    };

    fetchUserData();
  }, [user, db]);

  const handleLogout = () => {
    signOut(auth);
    setIsProfileMenuOpen(false);
  };

  const handleLogin = () => {
    setOnLoginPage(true);
  };

  const handleProfileClick = () => {
    onNavigateToProfile();
    setIsProfileMenuOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getDisplayName = () => {
    if (userData?.username) {
      return userData.username;
    } else if (userData?.displayName) {
      return userData.displayName;
    } else if (userData?.email) {
      return userData.email.split('@')[0];
    }
    return 'User';
  };

  const getInitial = () => {
    const displayName = getDisplayName();
    return displayName.charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm border-b border-white/10 relative z-50">
      <div className="flex items-center">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-white/80 hover:text-white transition-colors mr-3"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
          TaskX
        </h1>
      </div>

      <div className="flex items-center space-x-3">
        {/* Stats button */}
        <button 
          onClick={onNavigateToStats}
          className="text-white/80 hover:text-white transition-colors"
          title="Productivity Stats"
        >
          <BarChart2 size={20} />
        </button>
        
        {/* Integrate button */}
        <button 
          onClick={() => setShowIntegrateModal(true)}
          className="text-white/80 hover:text-white transition-colors"
          title="Integrate with Google Calendar"
        >
          <CalendarCheck size={20} />
        </button>
        
        <button className="text-white/80 hover:text-white transition-colors">
          <Search size={20} />
        </button>
        
        {user ? (
          <div className="relative" ref={profileMenuRef}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 rounded-full py-1 px-2 transition-colors"
            >
              {user.photoURL ? (
                <img 
                  src="/api/placeholder/28/28" 
                  alt="User Avatar" 
                  className="w-7 h-7 rounded-full border border-indigo-500" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
                  {userData ? getInitial() : user.email.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden md:block text-sm text-white/90 max-w-24 truncate">
                {userData ? getDisplayName() : user.email.split('@')[0]}
              </span>
              <ChevronDown size={16} className={`text-white/70 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isProfileMenuOpen && (
              <div className="fixed right-4 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 overflow-hidden z-[100]">
                <div className="p-3 border-b border-gray-700">
                  <p className="text-white font-medium truncate">
                    {userData?.displayName || getDisplayName()}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {userData?.username && `@${userData.username}`}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {userData?.email || user.email}
                  </p>
                </div>
                <div className="p-1">
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center space-x-2 w-full text-left p-2 hover:bg-white/10 rounded-md text-sm text-white/80 hover:text-white transition-colors"
                  >
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button className="flex items-center space-x-2 w-full text-left p-2 hover:bg-white/10 rounded-md text-sm text-white/80 hover:text-white transition-colors">
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full text-left p-2 hover:bg-red-900/30 rounded-md text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 rounded-lg py-1.5 px-3 transition-colors"
          >
            <LogIn size={18} />
            <span className="hidden md:block text-sm">Login</span>
          </button>
        )}
      </div>

      {showIntegrateModal && <IntegrateModal onClose={() => setShowIntegrateModal(false)} />}
    </div>
  );
};

const CalendarTroubleshooting = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Calendar Integration Troubleshooting</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-lg mb-2">Common Issues:</h4>
            <ul className="list-disc pl-5 space-y-2 text-white/80">
              <li>
                <span className="font-medium">API Errors:</span> The calendar API may be temporarily unavailable or incorrectly configured.
              </li>
              <li>
                <span className="font-medium">Authentication Issues:</span> Your Google account authentication may have expired.
              </li>
              <li>
                <span className="font-medium">Permissions:</span> You may not have granted the necessary calendar permissions.
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-lg mb-2">Troubleshooting Steps:</h4>
            <ol className="list-decimal pl-5 space-y-2 text-white/80">
              <li>Try disconnecting and reconnecting your Google Calendar.</li>
              <li>Make sure you've granted all required permissions.</li>
              <li>Check if the Google Calendar API is operational.</li>
              <li>Try refreshing the page and attempting the operation again.</li>
              <li>Clear your browser cache and cookies.</li>
            </ol>
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoHeader;