import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  UserCredential,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { FcGoogle } from "react-icons/fc";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showTooltip, setShowTooltip] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!username || username.length < 3 || !isSignUp) {
      setUsernameAvailable(null);
      return;
    }

    const checkUsernameUnique = async () => {
      setCheckingUsername(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        setUsernameAvailable(querySnapshot.empty);
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(() => {
      checkUsernameUnique();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, db, isSignUp]);

  if (isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl w-full max-w-md shadow-lg text-center">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
            You are already logged in
          </h2>
          <p className="text-gray-400 mt-4">
            You're already authenticated and can access the application.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="mt-6 p-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all transform hover:scale-[1.02] font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const saveUserToFirestore = async (userCredential: UserCredential, provider: string) => {
    const user = userCredential.user;
    
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: username.toLowerCase(), 
      displayName: user.displayName || username || email.split('@')[0],
      photoURL: user.photoURL,
      authProvider: provider,
      createdAt: serverTimestamp()
    }, { merge: true });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      if (passwordStrength < 3) {
        setError('Please create a stronger password');
        return;
      }
      
      if (!username || username.length < 3) {
        setError('Username must be at least 3 characters');
        return;
      }
      
      if (usernameAvailable === false) {
        setError('Username is already taken');
        return;
      }
      
      if (checkingUsername) {
        setError('Please wait while we check username availability');
        return;
      }
    }

    try {
      let userCredential: UserCredential;
      
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(userCredential, "email");
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      setIsAuthenticated(true);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError('Account not found. Need to sign up?');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Try again or reset your password.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('Email already in use. Try logging in instead.');
      } else {
        setError(error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      
      const defaultUsername = userCredential.user.email?.split('@')[0].toLowerCase() || '';
      
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", defaultUsername));
      const querySnapshot = await getDocs(q);
      
      let finalUsername = defaultUsername;
      if (!querySnapshot.empty) {
        finalUsername = `${defaultUsername}${Math.floor(Math.random() * 1000)}`;
      }
      
      setUsername(finalUsername);
      
      await saveUserToFirestore(userCredential, "google");
      setIsAuthenticated(true);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (isSignUp) {
      checkPasswordStrength(newPassword);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(newUsername);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl w-full max-w-md shadow-lg relative">
        <div className="absolute top-0 left-0 w-full h-2 rounded-t-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-80"></div>
        
        <div className="flex justify-center mb-6">
          {isSignUp ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
                Create Account
              </h2>
              <p className="text-gray-400 mt-2">Join us today and get started</p>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
                Welcome Back
              </h2>
              <p className="text-gray-400 mt-2">Login to continue your journey</p>
            </div>
          )}
        </div>
        
        {error && (
          <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            {error}
          </div>
        )}
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <label htmlFor="username" className="text-gray-400 text-sm block mb-1">Username</label>
              <input 
                id="username"
                type="text" 
                value={username}
                onChange={handleUsernameChange}
                placeholder="Choose a unique username"
                required={isSignUp}
                onFocus={() => setShowTooltip('username')}
                onBlur={() => setShowTooltip('')}
                className={`w-full p-3 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  username && username.length >= 3 
                    ? usernameAvailable === true 
                      ? 'focus:ring-green-500 border border-green-500/30' 
                      : usernameAvailable === false 
                        ? 'focus:ring-red-500 border border-red-500/30'
                        : 'focus:ring-indigo-500'
                    : 'focus:ring-indigo-500'
                }`}
              />
              {showTooltip === 'username' && (
                <div className="absolute left-0 -bottom-12 bg-gray-800 p-2 rounded text-xs text-gray-300 w-full z-10 shadow-lg">
                  Choose a unique username (only letters, numbers and underscores)
                </div>
              )}
              {username && username.length >= 3 && (
                <div className="absolute right-3 top-8">
                  {checkingUsername ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
                  ) : usernameAvailable === true ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : usernameAvailable === false ? (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : null}
                </div>
              )}
              {username && username.length >= 3 && (
                <div className="mt-1 text-xs">
                  {checkingUsername ? (
                    <span className="text-gray-400">Checking availability...</span>
                  ) : usernameAvailable === true ? (
                    <span className="text-green-500">Username is available</span>
                  ) : usernameAvailable === false ? (
                    <span className="text-red-500">Username is already taken</span>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <label htmlFor="email" className="text-gray-400 text-sm block mb-1">Email Address</label>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              onFocus={() => setShowTooltip('email')}
              onBlur={() => setShowTooltip('')}
              className="w-full p-3 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {showTooltip === 'email' && (
              <div className="absolute left-0 -bottom-12 bg-gray-800 p-2 rounded text-xs text-gray-300 w-full z-10 shadow-lg">
                {isSignUp ? "We'll use this email to create your account" : "Enter the email you used to register"}
              </div>
           )}
           </div>
           
           <div className="relative">
             <label htmlFor="password" className="text-gray-400 text-sm block mb-1">Password</label>
             <input 
               id="password"
               type="password" 
               value={password}
               onChange={handlePasswordChange}
               placeholder={isSignUp ? "Create a secure password" : "Your password"}
               required
               onFocus={() => setShowTooltip('password')}
               onBlur={() => setShowTooltip('')}
               className="w-full p-3 bg-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
             />
             {/* {showTooltip === 'password' && (
               <div className="absolute left-0 -bottom-12 bg-gray-800 p-2 rounded text-xs text-gray-300 w-full z-10 shadow-lg">
                 {isSignUp 
                   ? "Use at least 8 characters with uppercase, numbers and symbols"
                   : "Enter your password to access your account"
                 }
               </div>
             )} */}
           </div>
           
           {isSignUp && password.length > 0 && (
             <div className="mt-2">
               <div className="text-xs text-gray-400 mb-1">Password strength:</div>
               <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                 <div 
                   className={`h-full ${
                     passwordStrength === 0 ? 'bg-red-500 w-1/4' : 
                     passwordStrength === 1 ? 'bg-orange-500 w-2/4' : 
                     passwordStrength === 2 ? 'bg-yellow-500 w-3/4' : 
                     'bg-green-500 w-full'
                   } transition-all`}
                 ></div>
               </div>
               <div className="text-xs mt-1 text-gray-400">
                 {passwordStrength === 0 && "Very weak - Add more characters"}
                 {passwordStrength === 1 && "Weak - Try adding numbers"}
                 {passwordStrength === 2 && "Medium - Add special characters"}
                 {passwordStrength === 4 && "Strong - Perfect!"}
               </div>
             </div>
           )}
           
           {!isSignUp && (
             <div className="flex justify-end">
               <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300">
                 Forgot password?
               </button>
             </div>
           )}
           
           <button 
             type="submit"
             className="w-full p-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all transform hover:scale-[1.02] font-medium"
           >
             {isSignUp ? 'Create Account' : 'Login'}
           </button>
         </form>
         
         <div className="my-6 flex items-center">
           <div className="flex-1 border-t border-gray-600"></div>
           <span className="px-3 text-sm text-gray-400">or</span>
           <div className="flex-1 border-t border-gray-600"></div>
         </div>
         
         <div>
           <button 
             onClick={handleGoogleSignIn}
             className="w-full p-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center group"
           >
             <FcGoogle className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
             Continue with Google
           </button>
         </div>
         
         <div className="mt-6 text-center">
           <button 
             onClick={() => {
               setIsSignUp(!isSignUp);
               setError('');
               setUsername('');
               setUsernameAvailable(null);
             }}
             className="text-gray-400 hover:text-white transition-colors text-sm"
           >
             {isSignUp 
               ? 'Already have an account? Login instead' 
               : 'New here? Create an account'}
           </button>
         </div>
       </div>
     </div>
   );
 };
 
 export default LoginPage;