import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

export function useAuth() {
  // Initialize with cached credentials if offline to load instantly
  const [user, setUser] = useState<User | null>(() => {
    const cachedUid = localStorage.getItem('cached_user_uid');
    const cachedEmail = localStorage.getItem('cached_user_email');
    if (cachedUid && cachedEmail) {
      return { 
        uid: cachedUid, 
        email: cachedEmail, 
        emailVerified: true,
        displayName: localStorage.getItem('cached_user_display_name') || 'Artisan'
      } as any as User;
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const profileStr = localStorage.getItem('cached_user_profile');
      if (profileStr) {
        return JSON.parse(profileStr) as UserProfile;
      }
    } catch (e) {
      console.warn("Could not parse cached user profile", e);
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    const cachedUid = localStorage.getItem('cached_user_uid');
    // If we have cached session, let it load immediately instead of blocking the screen
    return cachedUid ? false : true;
  });

  useEffect(() => {
    console.log("Auth: Setting up listener...");
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth: onAuthStateChanged triggered", firebaseUser ? "User: " + firebaseUser.uid : "No User");
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Double check email verification for email-password users to prevent auto-login
        if (!firebaseUser.emailVerified && firebaseUser.providerData.some(p => p.providerId === 'password')) {
          console.log("Auth: user email is not verified, forcing email verification screens");
          auth.signOut().catch(err => console.error("Error signing out unverified user in useAuth:", err));
          setUser(null);
          setProfile(null);
          localStorage.removeItem('cached_user_uid');
          localStorage.removeItem('cached_user_email');
          localStorage.removeItem('cached_user_profile');
          localStorage.removeItem('cached_user_display_name');
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        localStorage.setItem('cached_user_uid', firebaseUser.uid);
        localStorage.setItem('cached_user_email', firebaseUser.email || '');
        localStorage.setItem('cached_user_display_name', firebaseUser.displayName || 'Artisan');

        try {
          console.log("Auth: Listening to profile for", firebaseUser.uid);
          unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
            if (userDoc.exists()) {
              console.log("Auth: Profile exists");
              const profileData = { uid: firebaseUser.uid, ...userDoc.data() } as UserProfile;
              setProfile(profileData);
              localStorage.setItem('cached_user_profile', JSON.stringify(profileData));
              setLoading(false);
            } else {
              console.log("Auth: Profile missing, creating default...");
              const now = new Date().toISOString();
              const isAdmin = firebaseUser.email === 'lewisiraki1@gmail.com';
              
              // New user from Google popup needs role, profile pic, and terms completed
              const newProfile: UserProfile = {
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
                role: isAdmin ? 'admin' : 'user',
                isProfileComplete: false, // Default is false for Google first-time login auto profile creation
                subscription: {
                  status: 'trial',
                  trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                }
              };
              
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            }
          }, (error) => {
            console.error("Auth: profile onSnapshot listener failed ->", error);
            // Fall back to cached profile data if snapshot failed (e.g. offline)
            const cachedProf = localStorage.getItem('cached_user_profile');
            if (cachedProf) {
              try {
                setProfile(JSON.parse(cachedProf));
              } catch (e) {
                console.error(e);
              }
            }
            setLoading(false);
          });
        } catch (error) {
          console.error("Auth: Profile Error ->", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('cached_user_uid');
        localStorage.removeItem('cached_user_email');
        localStorage.removeItem('cached_user_profile');
        localStorage.removeItem('cached_user_display_name');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return { user, profile, loading };
}
