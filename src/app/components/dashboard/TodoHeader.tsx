import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, X, LogIn, LogOut, User, Settings, ChevronDown, CalendarCheck, BarChart2, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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
  const [isConnected, setIsConnected] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  const handleGoogleAuth = async () => {
    setIsIntegrating(true);
    setIntegrationError('');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not logged in');
      }

      const clientId = '787997712321-mhs1p67s3djkq3nap4nr91lnjbiojvu7.apps.googleusercontent.com';
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrate`;
      const state = user.uid;
      
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

      localStorage.setItem('taskx_redirect_after_auth', window.location.pathname);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google auth failed:', error);
      setIntegrationStatus('');
      setIntegrationError('Failed to start Google authentication');
      setIsIntegrating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        googleTokens: null,
        googleCalendarId: null
      });
      
      setIsConnected(false);
      setIntegrationStatus('Disconnected from Google Calendar');
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      setIntegrationError('Failed to disconnect from Google Calendar');
    }
  };

  const checkExistingIntegration = async () => {
    if (!auth.currentUser) return;
    
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().googleTokens) {
        setIsConnected(true);
        setIntegrationStatus('Connected to Google Calendar');
      }
    } catch (error) {
      console.error('Error checking integration status:', error);
      setIntegrationError('Could not check integration status');
    }
  };

  useEffect(() => {
    checkExistingIntegration();
    
    const urlParams = new URLSearchParams(window.location.search);
    const integration = urlParams.get('integration');
    if (integration === 'success') {
      setIsConnected(true);
      setIntegrationStatus('Successfully connected to Google Calendar!');
    } else if (integration === 'error') {
      setIntegrationError('Failed to connect to Google Calendar');
    }
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 mt-64">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md" 
        onClick={onClose} pt-0
        aria-hidden="true"
      />
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-0 max-w-md w-full mx-4 border border-indigo-500/30 shadow-2xl relative z-50 animate-slideUp overflow-hidden">
        <div>
          <div className="absolute right-4 top-4">
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="p-6 pt-12 space-y-6">
          <div className="space-y-4">
            {/* Status indicator */}
            <div className="flex items-center justify-center mb-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {isConnected ? (
                  <CheckCircle size={32} />
                ) : (
                  <CalendarCheck size={32} />
                )}
              </div>
            </div>
            
            <div className="text-center">
              <h4 className="text-lg font-medium text-white">
                {isConnected ? 'Google Calendar Connected' : 'Connect Your Google Calendar'}
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                {isConnected 
                  ? "Your tasks with deadlines automatically sync with Google Calendar" 
                  : "Enable task syncing with Google Calendar including deadlines and recurring events"}
              </p>
            </div>
  
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center justify-center space-x-2 bg-red-600/80 hover:bg-red-600 text-white px-4 py-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 shadow-md hover:shadow-lg shadow-red-700/20"
              >
                <LogOut size={18} />
                <span>Disconnect Calendar</span>
              </button>
            ) : (
              <button
                onClick={handleGoogleAuth}
                disabled={isIntegrating}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 shadow-md hover:shadow-lg shadow-indigo-700/20"
              >
                <CalendarCheck size={18} />
                <span>
                  {isIntegrating ? 'Connecting...' : 'Connect Google Calendar'}
                </span>
              </button>
            )}
  
            {integrationStatus && (
              <div className="flex items-start space-x-3 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-sm text-green-300">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{integrationStatus}</p>
              </div>
            )}
  
            {integrationError && (
              <div className="flex items-start space-x-3 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{integrationError}</p>
                  <button 
                    onClick={() => setShowTroubleshooting(true)}
                    className="mt-2 text-blue-400 hover:text-blue-300 underline focus:outline-none text-sm"
                    aria-label="Show troubleshooting tips"
                  >
                    Need help troubleshooting?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feature list */}
          <div className="pt-2">
            <p className="text-sm font-medium text-gray-300 mb-3">What you get:</p>
            <ul className="space-y-2">
              <li className="text-sm text-gray-400 flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>Task deadlines automatically appear in your calendar</span>
              </li>
              <li className="text-sm text-gray-400 flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>Updates and changes sync in real-time</span>
              </li>
              <li className="text-sm text-gray-400 flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>Recurring tasks appear as recurring events</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {showTroubleshooting && (
        <CalendarTroubleshooting onClose={() => setShowTroubleshooting(false)} />
      )}
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
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);
            
            // Check if Google Calendar is connected
            if (userDoc.data().googleTokens) {
              setIsCalendarConnected(true);
            } else {
              setIsCalendarConnected(false);
            }
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
        
        {/* Calendar integration button with indicator */}
        <button 
          onClick={() => setShowIntegrateModal(true)}
          className="text-white/80 hover:text-white transition-colors relative"
          title={isCalendarConnected ? "Calendar Connected" : "Integrate with Google Calendar"}
        >
          <CalendarCheck size={20} />
          {isCalendarConnected && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
          )}
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
              <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 overflow-hidden z-[100]">
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
                  <button 
                    onClick={() => setShowIntegrateModal(true)}
                    className="flex items-center space-x-2 w-full text-left p-2 hover:bg-white/10 rounded-md text-sm text-white/80 hover:text-white transition-colors"
                  >
                    <CalendarCheck size={16} />
                    <span>Calendar Integration</span>
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

      {showIntegrateModal && (
        <IntegrateModal onClose={() => setShowIntegrateModal(false)} />
      )}
    </div>
  );
};

const CalendarTroubleshooting = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[999]">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-md w-full mx-4 border border-indigo-500/30 shadow-2xl max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 relative">
          <button 
            onClick={onClose} 
            className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1"
          >
            <X size={20} />
          </button>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Troubleshooting Guide
          </h3>
        </div>
        
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-lg mb-2 text-white">Common Issues:</h4>
              <ul className="list-none space-y-3 text-gray-300">
                <li className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-white">404 Error</span>
                    <p className="text-sm">The API routes may not be properly configured or the redirect URI in Google Cloud Console doesn't match your application.</p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-white">API Errors</span>
                    <p className="text-sm">The calendar API may be temporarily unavailable or incorrectly configured.</p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-white">Authentication Issues</span>
                    <p className="text-sm">Your Google account authentication may have expired.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-lg mb-2 text-white">Troubleshooting Steps:</h4>
              <ol className="list-none space-y-3 text-gray-300">
                <li className="flex items-start space-x-3">
                  <div className="bg-indigo-900/50 text-indigo-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium text-sm">1</div>
                  <p>Make sure you have the API route <code className="text-indigo-300 bg-indigo-900/30 px-1.5 py-0.5 rounded">/api/integrate</code> properly set up in your Next.js application.</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="bg-indigo-900/50 text-indigo-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium text-sm">2</div>
                  <p>Check that the redirect URI in your Google Cloud Console OAuth configuration matches exactly.</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="bg-indigo-900/50 text-indigo-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium text-sm">3</div>
                  <p>Try disconnecting and reconnecting your Google Calendar.</p>
                </li>
                <li className="flex items-start space-x-3">
                  <div className="bg-indigo-900/50 text-indigo-300 rounded-full h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5 font-medium text-sm">4</div>
                  <p>Make sure you've granted all required permissions.</p>
                </li>
              </ol>
            </div>
            
            <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg">
              <h4 className="font-medium text-sm mb-1 text-white">Redirect URI to use in Google Cloud Console:</h4>
              <div className="bg-gray-900 rounded p-3 flex items-center">
                <code className="text-xs overflow-x-auto text-indigo-200">
                  {window.location.origin}/api/integrate
                </code>
                <button 
                  className="ml-auto text-indigo-400 hover:text-indigo-300"
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/integrate`)}
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-900/50 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoHeader;