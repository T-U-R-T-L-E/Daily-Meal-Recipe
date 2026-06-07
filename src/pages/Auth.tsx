import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  updateProfile,
  signInWithPopup,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, appleProvider } from '../lib/firebase';
import { UserProfile } from '../types';
import { useErrorUX, InlineErrorHelper } from '../lib/ErrorUXContext';
import { 
  ChefHat, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  ShieldAlert,
  Clock,
  X,
  Camera,
  Upload,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const { handleError } = useErrorUX();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isFirstTime, setIsFirstTime] = useState(() => {
    return !localStorage.getItem('has_opened_before');
  });

  useEffect(() => {
    localStorage.setItem('has_opened_before', 'true');
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'user' | 'seller'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const PRESET_AVATARS = [
    { emoji: '🍳', label: 'Home Chef', bg: 'bg-amber-500/10 border-amber-500/20' },
    { emoji: '🍕', label: 'Pizzaiolo', bg: 'bg-orange-500/10 border-orange-500/20' },
    { emoji: '🧁', label: 'Baker', bg: 'bg-pink-500/10 border-pink-500/20' },
    { emoji: '🥑', label: 'Veganist', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { emoji: '🍣', label: 'Sushi Master', bg: 'bg-red-500/10 border-red-500/20' },
    { emoji: '🥗', label: 'Salad Lover', bg: 'bg-green-500/10 border-green-500/20' }
  ];

  const handleSelectPreset = (emoji: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, 150, 150);
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(75, 75, 68, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.font = '72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 75, 75);
      setPhotoURL(canvas.toDataURL('image/jpeg', 0.8));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) {
      setError('Profile picture must be under 800KB. Try a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPhotoURL(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Lockout / Rate Limiting (Login Protection)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Email Verification Flow Status
  const [verificationSent, setVerificationSent] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Terms and Privacy Checkbox & View States
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsDialogType, setTermsDialogType] = useState<'terms' | 'privacy'>('terms');

  // Check and decrement lockout timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft(prev => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  // Clean error and success messages when switching modes
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setDisplayNameError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
    setPhotoURL('');
  };

  // Basic Front-end Validations
  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const validatePasswordStrength = (pwd: string) => {
    // Standard rule: Min 6 characters, must contain at least one letter and one number
    if (pwd.length < 6) return 'Password must be at least 6 characters long.';
    if (!/[a-zA-Z]/.test(pwd)) return 'Password must contain at least one letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number.';
    return '';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setDisplayNameError('');
    setSuccess('');

    // Check lockout
    if (lockoutTimeLeft > 0) {
      setError(`Too many failed attempts. Suspended for security. Please wait ${lockoutTimeLeft}s.`);
      return;
    }

    // Front-end Input Validations
    if (!email) {
      setEmailError('Email address is required.');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please provide a valid email address.');
      return;
    }

    if (mode !== 'forgot') {
      if (!password) {
        setPasswordError('Password is required.');
        return;
      }
      
      if (mode === 'signup') {
        const strengthError = validatePasswordStrength(password);
        if (strengthError) {
          setPasswordError(strengthError);
          return;
        }
        if (password !== confirmPassword) {
          setConfirmPasswordError('Passwords do not match.');
          return;
        }
        if (!displayName.trim()) {
          setDisplayNameError('Display name is required.');
          return;
        }
        if (!acceptedTerms) {
          setError('We require confirming agreement to our Terms of Service & Privacy Policy to register.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        // Safe sign in action
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const loggedUser = userCredential.user;

        // Secure state: Reset login protection attempts
        setFailedAttempts(0);

        // Force a fresh reload of the user details from the backend to get the absolute latest verification state
        await loggedUser.reload();

        // Check if verification is needed (We support email-verification state)
        if (!loggedUser.emailVerified && !auth.currentUser?.emailVerified) {
          setPendingUser(loggedUser);
          setSuccess('Please verify your email address to log in.');
          
          // Sign out immediately from Firebase local state to prevent caching stale unverified status
          await auth.signOut();
          setLoading(false);
          return;
        }

      } else if (mode === 'signup') {
        // Sign up with Email/Password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const registeredUser = userCredential.user;

        // Set user display name immediately (omitting long base64 strings from firebase auth)
        const safePhotoURLForAuth = (photoURL && !photoURL.startsWith('data:')) ? photoURL : undefined;
        await updateProfile(registeredUser, { 
          displayName: displayName.trim(),
          photoURL: safePhotoURLForAuth
        });

        // Build elegant UserProfile Document exactly matching our types/schemas
        const now = new Date().toISOString();
        const isAdmin = email === 'lewisiraki1@gmail.com';
        const userProfile: UserProfile = {
          uid: registeredUser.uid,
          displayName: displayName.trim(),
          email: email,
          photoURL: photoURL || '',
          dietaryPreferences: [],
          allergies: [],
          skillLevel: 'Beginner',
          language: 'English',
          badges: ['Early Artisan'],
          streaks: 0,
          cookedCount: 0,
          points: 100,
          achievements: [{
            id: 'first-step',
            name: 'First Step',
            description: 'Joined the Discovery culinary community.',
            icon: 'Sparkles',
            unlockedAt: now
          }],
          activeChallenges: [{
            id: 'weekend-chef',
            name: 'Weekend Warrior',
            description: 'Cook 2 recipes this weekend.',
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            points: 500,
            progress: 0,
            goal: 2
          }],
          healthConditions: [],
          fitnessGoals: [],
          activityLevel: 'Moderate',
          createdAt: now,
          role: isAdmin ? 'admin' : role, // 'user' (customer) or 'seller'
          isProfileComplete: true,
          subscription: {
            status: 'trial',
            trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          }
        };

        // Save UserProfile collection on Firestore database
        await setDoc(doc(db, 'users', registeredUser.uid), userProfile);

        // Send Email Verification automatically
        await sendEmailVerification(registeredUser);
        setVerificationSent(true);
        setPendingUser(registeredUser);
        setSuccess('Account registered successfully! A verification email has been sent. Please verify before continuing.');
        
        // Log out to hold them in verification-pending mode
        await auth.signOut();
      } else if (mode === 'forgot') {
        // Password Reset Request
        await sendPasswordResetEmail(auth, email);
        setSuccess('A secure password reset link has been dispatched to your email address.');
      }
    } catch (err: any) {
      // Avoid printing benign user validation inputs with console.error to keep developer logs pristine and crash-free
      const isExpectedAuthWarning = [
        'auth/email-already-in-use',
        'auth/invalid-credential',
        'auth/wrong-password',
        'auth/user-not-found'
      ].includes(err.code);

      if (isExpectedAuthWarning) {
        console.warn("Auth check details:", err.code || err.message || err);
      } else {
        console.error("Auth Failure Exception:", err);
      }
      
      // Increment error attempts to active lockout
      if (mode === 'signin') {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          const timeout = 30; // 30 seconds suspension
          setLockoutTimeLeft(timeout);
          setError(`Too many failed login attempts. Suspended for ${timeout} seconds.`);
          setLoading(false);
          return;
        }
      }

      // Map firebase auth error codes to beautiful user-friendly alerts
      let userFriendlyError = 'An unexpected error occurred during authentication. Please retry.';
      switch (err.code) {
        case 'auth/email-already-in-use':
          userFriendlyError = 'This email address is already registered to another account.';
          setEmailError(userFriendlyError);
          break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          userFriendlyError = 'Incorrect email address or password. Please try again.';
          setPasswordError(userFriendlyError);
          break;
        case 'auth/user-not-found':
          userFriendlyError = 'No account associated with this email address was found.';
          setEmailError(userFriendlyError);
          break;
        case 'auth/too-many-requests':
          userFriendlyError = 'Your account access has been temporarily blocked due to multiple failed requests. Try again later.';
          setError(userFriendlyError);
          break;
        case 'auth/weak-password':
          userFriendlyError = 'The password is too weak. Please choose a sturdier password.';
          setPasswordError(userFriendlyError);
          break;
        case 'auth/network-request-failed':
          userFriendlyError = 'A connection error occurred. Check your network adapter.';
          setError(userFriendlyError);
          break;
        default:
          setError(userFriendlyError);
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for secure social Google Login fallback
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const userCredential = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCredential.user;

      // Ensure Profile exists for oauth users
      const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!profileSnap.exists()) {
        const now = new Date().toISOString();
        const isAdmin = firebaseUser.email === 'lewisiraki1@gmail.com';
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Artisan',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          dietaryPreferences: [],
          allergies: [],
          skillLevel: 'Beginner',
          language: 'English',
          badges: ['Early Artisan'],
          streaks: 0,
          cookedCount: 0,
          points: 100,
          achievements: [{
            id: 'first-step',
            name: 'First Step',
            description: 'Joined the Discovery culinary community.',
            icon: 'Sparkles',
            unlockedAt: now
          }],
          activeChallenges: [{
            id: 'weekend-chef',
            name: 'Weekend Warrior',
            description: 'Cook 2 recipes this weekend.',
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            points: 500,
            progress: 0,
            goal: 2
          }],
          healthConditions: [],
          fitnessGoals: [],
          activityLevel: 'Moderate',
          createdAt: now,
          role: isAdmin ? 'admin' : 'user', // regular customer user role
          isProfileComplete: false,
          subscription: {
            status: 'trial',
            trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          }
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      }
    } catch (err: any) {
      console.error("Google Auth error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google authentication failed. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for secure social Apple Login fallback
  const handleAppleSignIn = async () => {
    setError('');
    setSuccess('');
    try {
      setLoading(true);
      const userCredential = await signInWithPopup(auth, appleProvider);
      const firebaseUser = userCredential.user;

      // Ensure Profile exists for oauth users
      const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!profileSnap.exists()) {
        const now = new Date().toISOString();
        const isAdmin = firebaseUser.email === 'lewisiraki1@gmail.com';
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Artisan',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          dietaryPreferences: [],
          allergies: [],
          skillLevel: 'Beginner',
          language: 'English',
          badges: ['Early Artisan'],
          streaks: 0,
          cookedCount: 0,
          points: 100,
          achievements: [{
            id: 'first-step',
            name: 'First Step',
            description: 'Joined the Discovery culinary community.',
            icon: 'Sparkles',
            unlockedAt: now
          }],
          activeChallenges: [{
            id: 'weekend-chef',
            name: 'Weekend Warrior',
            description: 'Cook 2 recipes this weekend.',
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            points: 500,
            progress: 0,
            goal: 2
          }],
          healthConditions: [],
          fitnessGoals: [],
          activityLevel: 'Moderate',
          createdAt: now,
          role: isAdmin ? 'admin' : 'user', // regular customer user role
          isProfileComplete: false,
          subscription: {
            status: 'trial',
            trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          }
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      }
    } catch (err: any) {
      console.error("Apple Auth error:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Apple authentication failed. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-verify action for pending users
  const handleRequestVerificationResend = async () => {
    if (!pendingUser) return;
    try {
      setLoading(true);
      await sendEmailVerification(pendingUser);
      setSuccess('A fresh verification link has been sent to your email.');
    } catch (err: any) {
      setError('Failed to dispatch another verification email. Try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  // Clear pending state to retry login
  const handleBackToLoginInput = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.error("Signout error on back to login:", e);
    }
    setPendingUser(null);
    setVerificationSent(false);
    setSuccess('');
    setError('');
    setPassword('');
  };

  const hasLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const doesMatch = password === confirmPassword && confirmPassword.length > 0;

  // Stagger variants for premium item entrance animation
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring', 
        stiffness: 110,
        damping: 15
      } as const
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-coal to-graphite border border-white/[0.06] rounded-[40px] p-8 md:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-md">
        {/* Visual Premium Ambient Orbs */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-accent/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-accent/10 rounded-full blur-[80px]" />

        {/* Logo and Titles */}
        <div className="text-center space-y-4 mb-8 relative z-10">
          <div className="inline-flex bg-gradient-to-br from-amber-accent to-amber-gold p-3.5 rounded-2xl mx-auto shadow-2xl shadow-amber-accent/20">
            <ChefHat className="w-7 h-7 text-black" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-3xl text-white italic tracking-tight">
              Daily Meal Recipe
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-accent/60">
              Culinary Command Center
            </p>
          </div>
        </div>

        {/* Pending Verification Hold Screen */}
        {pendingUser ? (
          <div className="space-y-6 text-center relative z-10">
            <div className="bg-amber-accent/10 p-5 rounded-3xl border border-amber-accent/20 inline-block animate-pulse">
              <Mail className="w-10 h-10 text-amber-accent" />
            </div>

            <div className="space-y-3">
              <h3 className="font-serif text-2xl text-white italic">Verify Your Email</h3>
              <p className="text-sm text-gray-300 font-light leading-relaxed">
                We have sent you a verification email to <span className="text-white font-mono font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{pendingUser.email}</span>. Verify it and log in.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-xs text-rose-400 flex items-start gap-3 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs text-emerald-400 flex items-start gap-3 text-left">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <button
                onClick={handleBackToLoginInput}
                className="w-full px-6 py-4 bg-amber-accent hover:bg-white text-black hover:text-black text-xs uppercase tracking-widest font-bold rounded-2xl transition-all shadow-xl shadow-amber-accent/15 text-center cursor-pointer"
              >
                Log In
              </button>

              <button
                onClick={handleRequestVerificationResend}
                disabled={loading}
                className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs uppercase tracking-widest font-bold border border-white/5 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Processing...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {isFirstTime && (
              <div id="first-time-offline-banner" className="p-4 bg-amber-accent/10 border border-amber-accent/25 rounded-2xl text-xs text-amber-accent flex items-start gap-3 text-left">
                <Wifi className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-accent animate-pulse" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-[10px]">Connection Required Since It's Your First Visit</p>
                  <p className="text-[11px] leading-relaxed text-white/70">
                    You must be connected to the internet to complete your login or signup initially. Once you authorize your session, you can cook and manage everything offline perfectly!
                  </p>
                </div>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            {mode !== 'forgot' && (
              <div className="grid grid-cols-2 p-1.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-2">
                <button
                  onClick={() => handleModeChange('signin')}
                  className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    mode === 'signin' 
                      ? 'bg-amber-accent text-black font-bold shadow-lg shadow-amber-accent/5' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleModeChange('signup')}
                  className={`py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    mode === 'signup' 
                      ? 'bg-amber-accent text-black font-bold shadow-lg shadow-amber-accent/5' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            )}

            {/* General Feedback Notifications */}
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {error.includes("already registered") && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="ml-7 self-start px-3 py-1.5 bg-amber-accent hover:bg-white text-black text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    Switch to Sign In
                  </button>
                )}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 flex items-start gap-3">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {lockoutTimeLeft > 0 && (
              <div className="p-4 bg-amber-accent/10 border border-amber-accent/20 rounded-2xl text-xs text-amber-accent flex items-start gap-3">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                <span>Brute-force lock active. Cooling down for {lockoutTimeLeft}s.</span>
              </div>
            )}

            {/* Main Auth Forms */}
            <motion.form 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              onSubmit={handleAuthSubmit} 
              className="space-y-4"
            >
              {/* Reset Password Form Header */}
              {mode === 'forgot' && (
                <div className="text-center pb-2">
                  <h3 className="font-serif text-2xl text-white italic">Password Reset</h3>
                  <p className="text-xs text-gray-400 font-light mt-1 leading-relaxed">
                    Submit your email address to recover write privileges.
                  </p>
                </div>
              )}

              {/* Input for Display Name during Sign Up */}
              {mode === 'signup' && (
                <>
                  {/* Photo Upload section matching CompleteProfile design */}
                  <motion.div variants={itemVariants} className="space-y-2 mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
                      Profile Picture
                    </label>
                    <div className="flex items-center gap-4 bg-white/[0.01] p-4 border border-white/5 rounded-2xl">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-full border border-amber-accent/30 overflow-hidden bg-black/40 flex items-center justify-center shadow-md relative">
                          {photoURL ? (
                            <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-6 h-6 text-white/20" />
                          )}
                          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                        </div>
                        <label className="absolute -bottom-1 -right-1 p-1 bg-amber-accent hover:bg-white text-black rounded-full cursor-pointer shadow-md transition-all border border-black/10 duration-150 hover:scale-110">
                          <Camera className="w-3 h-3" />
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <p className="text-[11px] text-gray-400">
                          Upload file (&lt; 800KB) or select a gourmet food preset:
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[220px] scrollbar-none">
                          {PRESET_AVATARS.map((preset) => (
                            <button
                              key={preset.emoji}
                              type="button"
                              onClick={() => handleSelectPreset(preset.emoji)}
                              title={preset.label}
                              className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border transition-all text-sm hover:scale-105 active:scale-95 cursor-pointer ${preset.bg}`}
                            >
                              {preset.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <label htmlFor="display-name-input" className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
                      Display Name
                    </label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-amber-accent transition-colors" />
                      <input
                        id="display-name-input"
                        type="text"
                        placeholder="Chef de Cuisine"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (displayNameError) setDisplayNameError('');
                        }}
                        className={`w-full pl-12 pr-6 py-4 bg-white/5 border rounded-2xl text-sm text-white focus:bg-white/[0.01] outline-none transition-all ${
                          displayNameError 
                            ? 'border-red-500/70 focus:border-red-500 shadow-md shadow-red-500/5' 
                            : 'border-white/10 focus:border-amber-accent'
                        }`}
                        disabled={loading || lockoutTimeLeft > 0}
                        aria-required="true"
                        aria-invalid={!!displayNameError}
                        aria-describedby={displayNameError ? "display-name-error" : undefined}
                      />
                    </div>
                    <InlineErrorHelper id="display-name-error" message={displayNameError} />
                  </motion.div>
                </>
              )}

              {/* Email Fields */}
              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="email-input" className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-amber-accent transition-colors" />
                  <input
                    id="email-input"
                    type="email"
                    placeholder="email@address.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    className={`w-full pl-12 pr-6 py-4 bg-white/5 border rounded-2xl text-sm text-white focus:bg-white/[0.01] outline-none transition-all ${
                      emailError 
                        ? 'border-red-500/70 focus:border-red-500 shadow-md shadow-red-500/5' 
                        : 'border-white/10 focus:border-amber-accent'
                    }`}
                    disabled={loading || lockoutTimeLeft > 0}
                    aria-required="true"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                  />
                </div>
                <InlineErrorHelper id="email-error" message={emailError} />
              </motion.div>

              {/* Password Fields */}
              {mode !== 'forgot' && (
                <>
                  <motion.div variants={itemVariants} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="password-input" className="text-xs font-semibold uppercase tracking-wider text-white/50">
                        Password
                      </label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => handleModeChange('forgot')}
                          className="text-[10px] uppercase font-bold text-amber-accent/60 hover:text-amber-accent transition-colors tracking-widest"
                          disabled={loading || lockoutTimeLeft > 0}
                          aria-label="Forgot password request link"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-amber-accent transition-colors" />
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError('');
                        }}
                        className={`w-full pl-12 pr-12 py-4 bg-white/5 border rounded-2xl text-sm text-white focus:bg-white/[0.01] outline-none transition-all ${
                          passwordError 
                            ? 'border-red-500/70 focus:border-red-500 shadow-md shadow-red-500/5' 
                            : 'border-white/10 focus:border-amber-accent'
                        }`}
                        disabled={loading || lockoutTimeLeft > 0}
                        aria-required="true"
                        aria-invalid={!!passwordError}
                        aria-describedby={passwordError ? "password-error" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                        aria-label={showPassword ? "Hide password characters" : "Show password characters"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-white/30" />}
                      </button>
                    </div>
                    <InlineErrorHelper id="password-error" message={passwordError} />

                    {/* Real-time checklist under password input in Register mode */}
                    {mode === 'signup' && password.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-2 grid grid-cols-2 gap-2 text-[10px] font-medium"
                        aria-live="polite"
                      >
                        <div className={`flex items-center gap-1.5 transition-colors ${hasLength ? 'text-emerald-400' : 'text-white/20'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Min 6 characters</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors ${hasLetter ? 'text-emerald-400' : 'text-white/20'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>At least 1 letter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-400' : 'text-white/20'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>At least 1 number</span>
                        </div>
                        <div className={`flex items-center gap-1.5 transition-colors ${doesMatch ? 'text-emerald-400' : 'text-white/20'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Passwords match</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Confirm Password during Sign Up */}
                  {mode === 'signup' && (
                    <motion.div variants={itemVariants} className="space-y-2">
                      <label htmlFor="confirm-password-input" className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-amber-accent transition-colors" />
                        <input
                          id="confirm-password-input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (confirmPasswordError) setConfirmPasswordError('');
                          }}
                          className={`w-full pl-12 pr-6 py-4 bg-white/5 border rounded-2xl text-sm text-white focus:bg-white/[0.01] outline-none transition-all ${
                            confirmPasswordError 
                              ? 'border-red-500/70 focus:border-red-500 shadow-md shadow-red-500/5' 
                              : 'border-white/10 focus:border-amber-accent'
                          }`}
                          disabled={loading || lockoutTimeLeft > 0}
                          aria-required="true"
                          aria-invalid={!!confirmPasswordError}
                          aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                        />
                      </div>
                      <InlineErrorHelper id="confirm-password-error" message={confirmPasswordError} />
                    </motion.div>
                  )}
                </>
              )}

              {/* Role-Based Signup Selection */}
              {mode === 'signup' && (
                <motion.div variants={itemVariants} className="space-y-3 pt-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
                    Preferred Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`p-3.5 border rounded-2xl text-xs uppercase tracking-wider transition-all text-center font-bold flex flex-col items-center gap-1 cursor-pointer select-none active:scale-95 duration-200 ${
                        role === 'user'
                          ? 'bg-amber-accent/20 border-amber-accent text-amber-accent shadow-lg shadow-amber-accent/5'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Home Chef</span>
                      <span className="text-[8px] opacity-60 font-light">Browse / Create Favorites</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={`p-3.5 border rounded-2xl text-xs uppercase tracking-wider transition-all text-center font-bold flex flex-col items-center gap-1 cursor-pointer select-none active:scale-95 duration-200 ${
                        role === 'seller'
                          ? 'bg-amber-accent/20 border-amber-accent text-amber-accent shadow-lg shadow-amber-accent/5'
                          : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>Artisan (Seller)</span>
                      <span className="text-[8px] opacity-60 font-light">Publish Custom Recipes</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Terms of Service & Privacy Checkbox */}
              {mode === 'signup' && (
                <motion.div variants={itemVariants} className="flex items-start gap-3 pt-2 bg-white/[0.01] p-3 border border-white/5 rounded-2xl select-none">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4.5 h-4.5 accent-amber-accent shrink-0 mt-0.5 rounded border-white/10 bg-white/5 cursor-pointer"
                  />
                  <label htmlFor="terms-checkbox" className="text-[11px] text-gray-400 leading-relaxed cursor-pointer">
                    I acknowledge and agree to the{' '}
                    <Link
                      to="/terms"
                      target="_blank"
                      className="text-amber-accent hover:underline font-bold inline cursor-pointer"
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link
                      to="/privacy"
                      target="_blank"
                      className="text-amber-accent hover:underline font-bold inline cursor-pointer"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </motion.div>
              )}

              {/* Submit Buttons */}
              <motion.div variants={itemVariants} className="pt-4">
                <button
                  type="submit"
                  disabled={loading || lockoutTimeLeft > 0}
                  className="w-full py-4 bg-amber-accent hover:bg-white text-black hover:text-black rounded-2xl text-xs uppercase tracking-widest font-bold font-sans transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-accent/10 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' && 'Sign In'}
                      {mode === 'signup' && 'Complete Registration'}
                      {mode === 'forgot' && 'Send Password Reset Link'}
                      <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
                    </>
                  )}
                </button>
              </motion.div>
            </motion.form>

            {/* Pivot link for Back to Login */}
            {mode === 'forgot' && (
              <div className="text-center">
                <button
                  onClick={() => handleModeChange('signin')}
                  className="text-xs text-gray-400 hover:text-amber-accent uppercase tracking-widest font-black transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Alternating Google & Apple SSO Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <span className="relative px-4 bg-graphite text-[9px] font-black uppercase tracking-widest text-white/20">
                Or Continue With
              </span>
            </div>

            {/* Social SSO Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Google SSO Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-2xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              >
                <svg className="w-4 h-4 shrink-0 text-white" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              {/* Apple SSO Button */}
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-2xl text-[11px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              >
                <svg className="w-4 h-4 shrink-0 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.92.99-3.03-.95.04-2.1 1.1-2.78 1.9-.59.7-1.11 1.83-.97 2.92.81 0 1.95-.91 2.76-1.79z" />
                </svg>
                <span>Apple ID</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terms and Privacy Overlay Modal */}
      <AnimatePresence>
        {showTermsDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-left"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h3 className="font-serif text-2xl text-white italic capitalize">
                    {termsDialogType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                  </h3>
                  <p className="text-[10px] text-amber-accent/70 uppercase tracking-widest font-bold mt-1">
                    Last Updated: May 2026 • Daily Meal Recipe
                  </p>
                </div>
                <button
                  onClick={() => setShowTermsDialog(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Document Content */}
              <div className="p-8 overflow-y-auto text-sm text-gray-300 space-y-6 leading-relaxed font-sans max-h-[50vh] scrollbar-thin scrollbar-thumb-white/10">
                {termsDialogType === 'terms' ? (
                  <>
                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">1. Acceptance of Terms</h4>
                    <p>
                      By accessing or creating an account on Daily Meal Recipe, you contractually agree to these Terms of Service. If you do not agree to all terms, please do not use the service.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">2. Description of Service</h4>
                    <p>
                      Daily Meal Recipe is a digital meal planning, recipe generation, pantry tracking, and grocery organization platform. Users may access pro elements (Plus features) as part of a promotional or paid subscription structure.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">3. User Obligations & Conduct</h4>
                    <p>
                      You are solely responsible for protecting your credentials and authentication secrets. Any harmful actions, script injections, abuse of generator APIs, or non-compliant usage will result in an immediate permanent ban without refund.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">4. Disclaimers & Allergy Warning</h4>
                    <p>
                      Daily Meal Recipe generates menu suggestions through state-of-the-art visual scans and language intelligence. However, we DO NOT guarantee accurate determination of ingredients or absolute safety from allergens. All dietary ingredients, recipe preparations, and portion details must be checked manually.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">5. Support Contacts</h4>
                    <p>
                      For legal questions, payment queries, termination of accounts, or other enquiries, please contact us directly via email at:{' '}
                      <a href="mailto:info@dailymealrecipe.online" className="text-amber-accent underline font-bold">
                        info@dailymealrecipe.online
                      </a>
                      .
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">1. Data Collected</h4>
                    <p>
                      We process account credentials (emails, verification stamps) and metadata linked to your personal configuration, kitchen inventory, selected fitness objectives, and favorited dishes. This ensures cloud-synchronized state updates across devices.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">2. Processing Compliance</h4>
                    <p>
                      Daily Meal Recipe is fully compliant with modern data protection regulations including the EU General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA). You hold complete control to export your profile information as JSON or submit requests for full account purging.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">3. Third-Party Sharing</h4>
                    <p>
                      We do not rent, sell, or trade personal data to commercial ad-brokers. Payment details are transmitted securely via end-to-end encrypted tunnels straight to our secure external processor, and authentication is fully managed securely.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">4. Erasure and Export</h4>
                    <p>
                      To invoke your GDPR Right to Be Forgotten, or to instantly acquire a complete structural dump of all your custom recipes and points, head to the Privacy Center inside your Profile Dashboard, or dispatch a confirmation check email to:{' '}
                      <a href="mailto:info@dailymealrecipe.online" className="text-amber-accent underline font-bold">
                        info@dailymealrecipe.online
                      </a>
                      .
                    </p>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-slate-900 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
                  Daily Meal Recipe Secure Verification
                </span>
                <button
                  type="button"
                  onClick={() => setShowTermsDialog(false)}
                  className="px-6 py-2.5 bg-amber-accent hover:bg-white text-black font-bold uppercase tracking-widest text-[10px] rounded-full transition-all"
                >
                  Close Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
