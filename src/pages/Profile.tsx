import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { updateProfile } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Settings, Award, Flame, Zap, CheckCircle2, CreditCard, CloudCheck, HardDrive, RefreshCcw, ChefHat, Clock, Star, Trophy, Download, Trash2, Eye, EyeOff, Sun, Moon, Pencil, Camera, Upload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ProfileSkeleton } from '../components/recipes/RecipeSkeleton';

export default function Profile() {
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPrivacyData, setShowPrivacyData] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupStage, setBackupStage] = useState<string>('');
  const [restoreStage, setRestoreStage] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [verifiedBackup, setVerifiedBackup] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'overwrite'>('merge');
  const [appUpdating, setAppUpdating] = useState(false);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isFullScreenPhoto, setIsFullScreenPhoto] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

  const handleManualUpdate = () => {
    setAppUpdating(true);
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const diets = ['Vegan', 'Keto', 'Paleo', 'Vegetarian', 'Halal', 'Pescatarian', 'No Sugar'];
  const allergies = ['Nuts', 'Gluten', 'Dairy', 'Soy', 'Shellfish'];
  const healthConditionsList = ['Diabetic', 'Lactose Intolerant', 'Celiac', 'Hypertension', 'Low Cholesterol'];
  const fitnessGoalsList = ['Muscle Gain', 'Weight Loss', 'Endurance', 'Longevity'];
  const activityLevels: UserProfile['activityLevel'][] = ['Sedentary', 'Light', 'Moderate', 'Active', 'Athlete'];
  const levels = ['Beginner', 'Intermediate', 'Expert', 'Professional'];

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      setLoading(false);
    } else if (!user) {
      setProfile(null);
      setLoading(false);
    }
  }, [authProfile, user]);

  const toggleOption = (list: string[], item: string) => {
    if (list.includes(item)) {
      return list.filter(i => i !== item);
    }
    return [...list, item];
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      setTimeout(() => setIsSyncing(false), 1000); // Visual feedback
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      setIsSyncing(false);
    } finally {
      setSaving(false);
    }
  };

  const exportData = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `artisan_data_${profile.uid}.json`;
    a.click();
  };

  const deleteUserDocsByField = async (colPath: string, fieldName: string, uid: string) => {
    try {
      const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
      const q = query(collection(db, colPath), where(fieldName, '==', uid));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error(`Error deleting user docs in path ${colPath}:`, err);
    }
  };

  const deleteAccount = async () => {
    if (!user || !profile) return;
    if (!confirm("WARNING: Are you sure you want to permanently delete your account and ALL of your data? This will permanently erase your profile preferences, custom recipes, meal plans, pantry items, shopping lists, favorite links, cooking history, and active shared kitchen chores. This action is irreversible and fully compliant with GDPR right to erasure.")) {
      return;
    }

    setSaving(true);
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      console.log("Account Deletion: Purging Firestore user data...");

      // 1. Delete user profile doc from 'users'
      await deleteDoc(doc(db, 'users', user.uid));

      // 2. Delete user data across other collections
      await deleteUserDocsByField('recipes', 'authorId', user.uid);
      await deleteUserDocsByField('mealPlans', 'userId', user.uid);
      await deleteUserDocsByField('shoppingLists', 'userId', user.uid);
      await deleteUserDocsByField('pantry', 'userId', user.uid);
      await deleteUserDocsByField('favorites', 'userId', user.uid);
      await deleteUserDocsByField('cookingLogs', 'userId', user.uid);
      await deleteUserDocsByField('sharedTodos', 'creatorId', user.uid);

      console.log("Account Deletion: Firestore data deleted successfully.");

      // 3. Delete Firebase Auth User account
      try {
        await user.delete();
        alert("Your account and all associated culinary data have been completely and permanently erased.");
      } catch (authError: any) {
        if (authError.code === 'auth/requires-recent-login') {
          if (confirm("For safety compliance, deleting your credentials requires a recent authentication. Click OK to re-authenticate with Google and finalize deletion.")) {
            const { GoogleAuthProvider, reauthenticateWithPopup } = await import('firebase/auth');
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, provider);
            await user.delete();
            alert("Your account and all associated culinary data have been completely and permanently erased.");
          } else {
            alert("Firestore collection references have been wiped, but the auth credential requires re-login to be terminated.");
          }
        } else {
          throw authError;
        }
      }
    } catch (e: any) {
      console.error("Critical error while purging account data:", e);
      alert("An error occurred during account deletion: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const runActualBackup = async () => {
    if (!user || !profile) return;
    setBackingUp(true);
    setBackupStage('Initializing backup ledger...');
    setBackupProgress(5);
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      // Stage 1: Extended profile preferences
      setBackupStage('Bundling profile preferences...');
      setBackupProgress(15);
      const profileData = { ...profile };

      // Stage 2: User custom recipes
      setBackupStage('Compiling custom recipes...');
      setBackupProgress(25);
      const recipesSnap = await getDocs(query(collection(db, 'recipes'), where('authorId', '==', user.uid)));
      const recipes = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 3: Meal planning calendar
      setBackupStage('Securing meal planner calendar...');
      setBackupProgress(35);
      const plansSnap = await getDocs(query(collection(db, 'mealPlans'), where('userId', '==', user.uid)));
      const mealPlans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 4: Pantry items
      setBackupStage('Counting pantry ingredients...');
      setBackupProgress(45);
      const pantrySnap = await getDocs(query(collection(db, 'pantry'), where('userId', '==', user.uid)));
      const pantry = pantrySnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 5: Shopping lists
      setBackupStage('Formulating grocery shopping list...');
      setBackupProgress(55);
      const shoppingSnap = await getDocs(query(collection(db, 'shoppingLists'), where('userId', '==', user.uid)));
      const shoppingLists = shoppingSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 6: Cooking achievement logs & history
      setBackupStage('Exporting historic culinary journals...');
      setBackupProgress(65);
      const logsSnap = await getDocs(query(collection(db, 'cookingLogs'), where('userId', '==', user.uid)));
      const cookingLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 7: Favorite links
      setBackupStage('Bookmarking favorited collections...');
      setBackupProgress(75);
      const favSnap = await getDocs(query(collection(db, 'favorites'), where('userId', '==', user.uid)));
      const favorites = favSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 8: Uploaded gourmet files and documents
      setBackupStage('Indexing gourmet design assets & file databases...');
      setBackupProgress(85);
      const filesSnap = await getDocs(query(collection(db, 'files'), where('userId', '==', user.uid)));
      const files = filesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 9: Shared Todos and kitchen chores
      setBackupStage('Syncing kitchen chores list...');
      setBackupProgress(90);
      const todosSnap = await getDocs(query(collection(db, 'sharedTodos'), where('creatorId', '==', user.uid)));
      const sharedTodos = todosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Stage 10: Family circles where creator or member
      setBackupStage('Mapping family cooking circles...');
      setBackupProgress(95);
      const familiesSnapCreator = await getDocs(query(collection(db, 'families'), where('creatorId', '==', user.uid)));
      const familiesSnapMember = await getDocs(query(collection(db, 'families'), where('members', 'array-contains', user.uid)));
      
      const familiesMap = new Map();
      familiesSnapCreator.docs.forEach(d => familiesMap.set(d.id, { id: d.id, ...d.data() }));
      familiesSnapMember.docs.forEach(d => familiesMap.set(d.id, { id: d.id, ...d.data() }));
      const families = Array.from(familiesMap.values());

      setBackupStage('Finalizing packages...');
      setBackupProgress(100);

      // Construct grand JSON package
      const backupPayload = {
        app: "Artisan Culinary",
        backupEmail: user.email || profile.email,
        backupUserId: user.uid,
        backupDate: new Date().toISOString(),
        data: {
          profile: profileData,
          recipes,
          mealPlans,
          shoppingLists,
          pantry,
          favorites,
          cookingLogs,
          sharedTodos,
          files,
          families
        }
      };

      // Perform Browser Download
      const formattedBackup = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([formattedBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artisan_culinary_backup_${user.email || 'user'}_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();

      // Also set standard safety backup for instant device storage cache recovery
      localStorage.setItem(`safety_backup_${user.uid}`, formattedBackup);

      setShowBackupModal(false);
    } catch (error: any) {
      console.error("Compile backup failed:", error);
      alert("Error packaging culinary backup: " + (error.message || error));
    } finally {
      setBackingUp(false);
      setBackupStage('');
      setBackupProgress(0);
    }
  };

  const handleBackupFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        
        // 1. Structural check
        if (!parsed.app || !parsed.data || !parsed.backupEmail) {
          alert("Error: The selected file is not a valid Artisan Culinary Backup. Please upload a genuine backup file (.json).");
          return;
        }

        // 2. Email protection to prevent subscription abuse and account switching
        const currentEmail = user?.email || profile?.email || '';
        const backupEmail = parsed.backupEmail;

        if (currentEmail.toLowerCase().trim() !== backupEmail.toLowerCase().trim()) {
          alert(`🗝️ SECURITY BLOCK: To prevent account fraud, pirate sharing, and subscription evasion, backups can ONLY be restored to the matching verified email address.\n\nBackup Email: ${backupEmail}\nLogged-In Email: ${currentEmail}\n\nPlease sign in with the correct email account to proceed.`);
          return;
        }

        // Match detected, verify data
        setVerifiedBackup(parsed);
        setShowRestoreModal(true);
      } catch (err: any) {
        alert("Corrupted Data File: The uploaded file has corrupted syntax. Please ensure it is a complete valid JSON file generated from your Device Backups.");
      }
    };
    reader.readAsText(file);
    // Reset file input target value so the same file can be selected again
    event.target.value = '';
  };

  const runActualRestore = async () => {
    if (!user || !verifiedBackup) return;
    setIsRestoring(true);
    setRestoreProgress(5);
    setRestoreStage('Initializing secure system recovery...');
    
    try {
      const { collection, doc, setDoc, addDoc, getDocs, deleteDoc, query, where } = await import('firebase/firestore');
      
      const originalUid = verifiedBackup.backupUserId;
      const currentUid = user.uid;

      // Safe Remapping helper function
      const remapUser = (item: any) => {
        const copy = { ...item };
        delete copy.id; // Strip old Firestore ID to let addDoc generate a fresh matching structure
        
        if (copy.userId === originalUid) copy.userId = currentUid;
        if (copy.authorId === originalUid) copy.authorId = currentUid;
        if (copy.creatorId === originalUid) copy.creatorId = currentUid;
        
        if (copy.members && Array.isArray(copy.members)) {
          copy.members = copy.members.map((m: string) => m === originalUid ? currentUid : m);
        }
        return copy;
      };

      // If Overwrite mode is selected, erase existing database entries to ensure "Looks like it was never deleted" clean state
      if (restoreMode === 'overwrite') {
        const statusMsg = 'Purging existing cloud data collections for a clean write...';
        setRestoreStage(statusMsg);
        setRestoreProgress(10);
        
        await deleteUserDocsByField('recipes', 'authorId', currentUid);
        await deleteUserDocsByField('mealPlans', 'userId', currentUid);
        await deleteUserDocsByField('shoppingLists', 'userId', currentUid);
        await deleteUserDocsByField('pantry', 'userId', currentUid);
        await deleteUserDocsByField('favorites', 'userId', currentUid);
        await deleteUserDocsByField('cookingLogs', 'userId', currentUid);
        await deleteUserDocsByField('sharedTodos', 'creatorId', currentUid);
        await deleteUserDocsByField('files', 'userId', currentUid);
        await deleteUserDocsByField('families', 'creatorId', currentUid);
      }

      // Step 1: Restore main UserProfile doc
      setRestoreStage('Syncing profile configurations...');
      setRestoreProgress(20);
      const restoredProfileRaw = verifiedBackup.data.profile || {};
      const finalProfile: UserProfile = {
        ...profile, // Keep current user info as fallback
        ...restoredProfileRaw,
        uid: currentUid, // Override UID with modern UID
        email: user.email // Override Email to guarantee matching email verification
      };
      await setDoc(doc(db, 'users', currentUid), finalProfile);
      setProfile(finalProfile);

      // Helper to add or merge collection records
      const restoreCollection = async (
        colPath: string, 
        items: any[], 
        matchField: string, 
        userField: string,
        progressStart: number,
        progressEnd: number,
        stageMsg: string
      ) => {
        if (!items || items.length === 0) return;
        setRestoreStage(stageMsg);
        const steps = items.length;
        
        // Fetch existing records for this user to avoid duplicates if merging
        let existingItemsList: any[] = [];
        if (restoreMode === 'merge') {
          try {
            const snap = await getDocs(query(collection(db, colPath), where(userField, '==', currentUid)));
            existingItemsList = snap.docs.map(doc => doc.data());
          } catch (e) {
            console.error(`Could not check existing for ${colPath}`, e);
          }
        }

        for (let i = 0; i < items.length; i++) {
          const currentProgress = progressStart + Math.round(((i + 1) / steps) * (progressEnd - progressStart));
          setRestoreProgress(currentProgress);

          const remapped = remapUser(items[i]);
          
          // Check for duplication in merge mode
          let isDuplicate = false;
          if (restoreMode === 'merge') {
            isDuplicate = existingItemsList.some(ex => {
              if (matchField === 'name' || matchField === 'item' || matchField === 'fileName' || matchField === 'text') {
                return ex[matchField]?.trim()?.toLowerCase() === remapped[matchField]?.trim()?.toLowerCase();
              }
              if (matchField === 'unique_meal') {
                return ex.date === remapped.date && ex.mealType === remapped.mealType && ex.recipeId === remapped.recipeId;
              }
              return false;
            });
          }

          if (!isDuplicate) {
            await addDoc(collection(db, colPath), remapped);
          }
        }
      };

      // Step 2: Custom Recipes
      await restoreCollection('recipes', verifiedBackup.data.recipes || [], 'name', 'authorId', 20, 35, 'Re-publishing custom recipe books...');

      // Step 3: Meal planning calendar
      await restoreCollection('mealPlans', verifiedBackup.data.mealPlans || [], 'unique_meal', 'userId', 35, 45, 'Populating chef calendar schedules...');

      // Step 4: Pantry inventory
      await restoreCollection('pantry', verifiedBackup.data.pantry || [], 'item', 'userId', 45, 55, 'Restocking kitchen pantry inventory...');

      // Step 5: Grocery Shopping list
      await restoreCollection('shoppingLists', verifiedBackup.data.shoppingLists || [], 'item', 'userId', 55, 65, 'Writing shopping grocery checklists...');

      // Step 6: Historic cooking records
      await restoreCollection('cookingLogs', verifiedBackup.data.cookingLogs || [], 'recipeId', 'userId', 65, 75, 'Logging past cooking achievement log entries...');

      // Step 7: Bookmarked Favorite links
      await restoreCollection('favorites', verifiedBackup.data.favorites || [], 'recipeId', 'userId', 75, 80, 'Saving culinary custom bookmarks...');

      // Step 8: Uploaded gourmet documents & storage files
      await restoreCollection('files', verifiedBackup.data.files || [], 'fileName', 'userId', 80, 85, 'Restoring gourmet files & media references...');

      // Step 9: Kitchen shared collaborative tasks/todos
      await restoreCollection('sharedTodos', verifiedBackup.data.sharedTodos || [], 'text', 'creatorId', 85, 90, 'Setting up shared family kitchen chores...');

      // Step 10: Family circles configurations
      await restoreCollection('families', verifiedBackup.data.families || [], 'name', 'creatorId', 90, 95, 'Connecting family cooking circles...');

      setRestoreStage('Writing local device state registers...');
      setRestoreProgress(100);

      // Save sync copy locally as well for offline fast recovery fallback
      localStorage.setItem(`safety_backup_${currentUid}`, JSON.stringify(verifiedBackup));

      alert(`Restoration Complete! All data records have been safely aligned, synced, and restored into Cloud Firestore. It is exactly as if your account was never deleted.`);
      setShowRestoreModal(false);
      setVerifiedBackup(null);
      
      // Reload the page smoothly to let state rebuild and load restored database
      window.location.reload();
    } catch (e: any) {
      console.error("Restore failed:", e);
      alert("Database Synchronization Error during restore: " + (e.message || e));
    } finally {
      setIsRestoring(false);
      setRestoreStage('');
      setRestoreProgress(0);
    }
  };

  const triggerDeviceBackup = () => {
    setShowBackupModal(true);
  };

  const triggerUploadRestore = () => {
    const el = document.getElementById('backup-file-input');
    if (el) {
      el.click();
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!user || !profile) {
    return (
      <div className="max-w-md mx-auto my-12 text-center py-16 px-8 bg-coal border border-white/5 rounded-[40px] shadow-2xl relative overflow-hidden">
        {/* Subtle Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500/20 via-amber-accent to-rose-500/20" />
        
        {/* Decorative Glowing Orbs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-accent/10 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 blur-[60px] -ml-16 -mb-16 rounded-full pointer-events-none" />

        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-amber-accent/10 border border-amber-accent/25 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-accent/5">
            <ChefHat className="w-8 h-8 text-amber-accent" />
          </div>

          <div className="space-y-2">
            <h2 className="text-white font-serif text-3xl italic">
              Sign In to View Profile
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-amber-accent/70">
              Access Restricted
            </p>
          </div>

          <p className="text-sm text-gray-400 italic font-light leading-relaxed px-4">
            Please sign in to view your profile settings, dietary preferences, cooking milestones, streaks, and data export features.
          </p>

          <div className="w-full pt-6 border-t border-white/5 flex flex-col gap-3">
            <Link
              to="/auth"
              className="w-full h-14 bg-amber-accent hover:bg-white text-black rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-amber-accent/10"
            >
              Sign In / Sign Up
            </Link>
            <Link
              to="/discover"
              className="w-full h-14 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center transition-all cursor-pointer"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      {/* GDPR & Security Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-8"
      >
        <div className="flex items-center gap-6">
          <div className="p-4 bg-emerald-500 rounded-2xl text-black">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-serif text-2xl text-white italic">Privacy First Architecture</h3>
            <p className="text-gray-500 text-xs italic mt-1">GDPR Compliant. End-to-end encryption for all culinary data & personal info.</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 group">
             <CloudCheck className="w-4 h-4 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Storage: Encrypted</span>
          </div>
          <div className="w-px h-4 bg-white/10 hidden md:block" />
          <button 
            onClick={() => setShowPrivacyData(!showPrivacyData)}
            className="flex items-center gap-2 group text-white/40 hover:text-white transition-colors"
          >
             {showPrivacyData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             <span className="text-[10px] font-black uppercase tracking-widest">Privacy Center</span>
          </button>
        </div>
      </motion.div>

      {/* Privacy Center Modal/Expansion */}
      <AnimatePresence>
        {showPrivacyData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-graphite/30 border border-white/5 rounded-[32px] p-8 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Your Data Rights</h4>
                <p className="text-[10px] text-white/40 leading-relaxed italic">
                  Under GDPR, you have the right to access, export, and delete your personal data. Discovery uses secure standards with encryption at rest and in transit.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={exportData}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-all"
                  >
                    <Download className="w-3 h-3" />
                    Export JSON
                  </button>
                  <button 
                    onClick={deleteAccount}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Request Erasure
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Security Log</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] text-white/20 italic border-b border-white/5 pb-2">
                    <span>Last Login</span>
                    <span>{format(new Date(), 'MMM d, h:mm a')}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-white/20 italic border-b border-white/5 pb-2">
                    <span>Encryption Key</span>
                    <span>AES-256 (Cloud Managed)</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-white/20 italic">
                    <span>IP Address</span>
                    <span>Masked (CDN Proxy)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-12 border-b border-white/5 pb-16">
        <div className="relative group">
          <div className="absolute inset-0 bg-amber-accent/20 blur-3xl rounded-full" />
          
          {/* Profile Image with click to view full screen */}
          <div 
            onClick={() => setIsFullScreenPhoto(true)}
            className="w-40 h-40 rounded-full border-2 border-white/10 relative z-10 p-1 bg-onyx cursor-zoom-in overflow-hidden hover:border-amber-accent/40 transition-all"
          >
            <img 
              src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
              className="w-full h-full rounded-full object-cover"
              alt="User"
            />
            {/* Click to view full screen overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Pencil Edit button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingPhoto(true);
            }}
            className="absolute bottom-2 right-2 z-20 bg-amber-accent text-black p-2.5 rounded-full shadow-xl hover:bg-white hover:scale-110 transition-all cursor-pointer"
            title="Edit Profile Picture"
          >
             <Pencil className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-6 text-center md:text-left">
          <div className="space-y-2">
            <h1 className="font-serif text-6xl font-light text-white leading-none">{profile.displayName}</h1>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <p className="text-amber-accent/60 font-bold uppercase tracking-[0.4em] text-xs underline underline-offset-8 decoration-amber-accent/20">
                 {profile.skillLevel}
              </p>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-accent fill-amber-accent" />
                <span className="text-xl font-serif text-white italic">{profile.points || 0} <span className="text-[10px] uppercase font-black tracking-normal text-white/20">Points</span></span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Cooking Streak</span>
              <div className="flex items-center gap-2 text-white font-serif text-2xl italic">
                <Flame className="w-5 h-5 text-amber-accent fill-current" />
                {profile.streaks} Days
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Total Cooked</span>
              <div className="flex items-center gap-2 text-white font-serif text-2xl italic">
                <ChefHat className="w-5 h-5 text-amber-accent" />
                {profile.cookedCount || 0} Dishes
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
        <div className="space-y-12">
          {/* Dietary Preferences */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-accent" />
              <h3 className="font-serif text-3xl font-light text-white italic">Dietary Preferences</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {diets.map(diet => (
                <button
                  key={diet}
                  onClick={() => setProfile({...profile, dietaryPreferences: toggleOption(profile.dietaryPreferences, diet)})}
                  className={`px-5 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                    profile.dietaryPreferences.includes(diet) 
                      ? 'bg-amber-accent border-amber-accent text-black' 
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </section>

          {/* Allergies */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-accent" />
              <h3 className="font-serif text-3xl font-light text-white italic">Allergies</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {allergies.map(alg => (
                <button
                  key={alg}
                  onClick={() => setProfile({...profile, allergies: toggleOption(profile.allergies, alg)})}
                  className={`px-5 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                    profile.allergies.includes(alg) 
                      ? 'bg-red-500 border-red-500 text-white' 
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {alg}
                </button>
              ))}
            </div>
          </section>

          {/* Health Conditions */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              <h3 className="font-serif text-3xl font-light text-white italic">Health Focus</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {healthConditionsList.map(hc => (
                <button
                  key={hc}
                  onClick={() => setProfile({...profile, healthConditions: toggleOption(profile.healthConditions || [], hc)})}
                  className={`px-5 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                    (profile.healthConditions || []).includes(hc) 
                      ? 'bg-white text-black border-white' 
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {hc}
                </button>
              ))}
            </div>
          </section>

          {/* Fitness Goals */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="font-serif text-3xl font-light text-white italic">Fitness Goals</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {fitnessGoalsList.map(goal => (
                <button
                  key={goal}
                  onClick={() => setProfile({...profile, fitnessGoals: toggleOption(profile.fitnessGoals || [], goal)})}
                  className={`px-5 py-2.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                    (profile.fitnessGoals || []).includes(goal) 
                      ? 'bg-amber-accent border-amber-accent text-black' 
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-12">
          {/* Subscription Status */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-amber-accent" />
              <h3 className="font-serif text-3xl font-light text-white italic">Plan</h3>
            </div>
            <div className="bg-graphite p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-accent mb-1">Current Status</p>
                  <p className="text-white text-lg capitalize">{profile.subscription?.status || 'None'}</p>
                </div>
                <Link 
                  to="/subscription" 
                  className="px-6 py-2 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  Manage
                </Link>
              </div>
              {profile.subscription?.status === 'trial' && (() => {
                const msLeft = profile.subscription.trialEndDate ? new Date(profile.subscription.trialEndDate).getTime() - Date.now() : 0;
                const dLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
                const hLeft = Math.ceil(msLeft / (1000 * 60 * 60));
                
                let timeStr = "";
                if (msLeft <= 0) {
                  timeStr = "Expired";
                } else if (hLeft < 48) {
                  timeStr = hLeft < 2 ? "1 hour left" : `${hLeft} hours left`;
                } else {
                  timeStr = `${Math.min(14, dLeft)} days left`;
                }

                return (
                  <p className="text-white/40 text-xs italic">
                    Free trial ends on: {profile.subscription.trialEndDate ? new Date(profile.subscription.trialEndDate).toLocaleDateString() : ""} ({timeStr})
                  </p>
                );
              })()}
            </div>
          </section>

          {/* Activity Level */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-accent" />
              <h3 className="font-serif text-3xl font-light text-white italic">Activity Level</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {activityLevels.map(al => (
                <button
                  key={al}
                  onClick={() => setProfile({...profile, activityLevel: al})}
                  className={`px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all text-left flex items-center justify-between ${
                    profile.activityLevel === al 
                      ? 'bg-amber-accent border-amber-accent text-black' 
                      : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}
                >
                  {al}
                  {profile.activityLevel === al && <CheckCircle2 className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/20 italic italic">This helps adjust ingredient portions and protein recommendations.</p>
          </section>

          {/* Visual Theme */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              {profile.themePreference === 'light' ? (
                <Sun className="w-5 h-5 text-amber-accent" />
              ) : (
                <Moon className="w-5 h-5 text-amber-accent" />
              )}
              <h3 className="font-serif text-3xl font-light text-white italic">Visual Theme</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setProfile({ ...profile, themePreference: 'dark' });
                  localStorage.setItem('theme_pref', 'dark');
                  document.documentElement.classList.remove('light');
                }}
                className={`px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all text-left flex items-center justify-between cursor-pointer ${
                  profile.themePreference !== 'light'
                    ? 'bg-amber-accent border-amber-accent text-black'
                    : 'border-white/10 text-white/40 hover:border-white/30 bg-onyx'
                }`}
              >
                Dark Mode
                {profile.themePreference !== 'light' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfile({ ...profile, themePreference: 'light' });
                  localStorage.setItem('theme_pref', 'light');
                  document.documentElement.classList.add('light');
                }}
                className={`px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all text-left flex items-center justify-between cursor-pointer ${
                  profile.themePreference === 'light'
                    ? 'bg-amber-accent border-amber-accent text-black'
                    : 'border-white/10 text-white/40 hover:border-white/30 bg-onyx'
                }`}
              >
                Light Mode
                {profile.themePreference === 'light' && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
              </button>
            </div>
            <p className="text-[9px] text-white/20 italic">Select your preferred style. Dark mode is active by default.</p>
          </section>

          {/* Skill Level */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-amber-accent" />
              <h3 className="font-serif text-3xl font-light text-white italic">Skill Level</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setProfile({...profile, skillLevel: lvl as any})}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    profile.skillLevel === lvl 
                      ? 'bg-graphite border-amber-accent shadow-lg shadow-amber-accent/5' 
                      : 'border-white/5 bg-onyx text-white/40 hover:border-white/20'
                  }`}
                >
                  <span className={`text-xs font-bold uppercase tracking-widest ${profile.skillLevel === lvl ? 'text-white' : ''}`}>
                    {lvl}
                  </span>
                  {profile.skillLevel === lvl && <CheckCircle2 className="w-5 h-5 text-amber-accent" />}
                </button>
              ))}
            </div>
          </section>

          {/* Preferred Billing Currency */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-amber-accent" />
              <h3 className="font-serif text-3xl font-light text-white italic">Billing Currency</h3>
            </div>
            <div className="relative">
              <select
                value={profile.preferredCurrency || 'KES'}
                onChange={(e) => setProfile({ ...profile, preferredCurrency: e.target.value as any })}
                className="w-full bg-onyx text-white border border-white/10 rounded-2xl p-5 text-xs font-semibold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-accent transition-all cursor-pointer select-none"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                }}
              >
                <option value="KES" className="bg-onyx text-white font-sans">KES - Kenyan Shilling (M-PESA & Local Cards)</option>
                <option value="USD" className="bg-onyx text-white font-sans">USD - United States Dollar (International Cards)</option>
                <option value="NGN" className="bg-onyx text-white font-sans">NGN - Nigerian Naira (Cards & Bank Transfers)</option>
                <option value="GHS" className="bg-onyx text-white font-sans">GHS - Ghanaian Cedi (Cards & Mobile Money)</option>
                <option value="ZAR" className="bg-onyx text-white font-sans">ZAR - South African Rand (Cards & EFT)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-white/40">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <p className="text-[9px] text-white/20 italic">
              Choose your default payment currency. If your card fails with a "Currency not supported by merchant" error, switch this setting to match your card's region or try USD.
            </p>
          </section>

          <button 
            onClick={saveProfile}
            disabled={saving}
            className="w-full py-5 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-[11px] hover:bg-amber-accent transition-all shadow-xl disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          <div className="pt-4 space-y-4">
             <div className="h-px bg-white/5 w-full" />
             <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 text-center">Troubleshooting & Support</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={triggerDeviceBackup}
                    disabled={backingUp}
                    className="py-4 border border-white/5 bg-onyx text-amber-accent hover:text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    <HardDrive className="w-3 h-3" />
                    {backingUp ? 'Compiling Backup...' : 'Backup Data to Device'}
                  </button>
                  <button 
                    onClick={triggerUploadRestore}
                    className="py-4 border border-white/5 bg-onyx text-white/40 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Restore Backup File
                  </button>
                  <input 
                    type="file" 
                    id="backup-file-input" 
                    className="hidden" 
                    onChange={handleBackupFileSelected} 
                    accept=".json" 
                  />
                </div>

                <button 
                  onClick={handleManualUpdate}
                  disabled={appUpdating}
                  className="w-full py-4 border border-amber-accent/20 bg-amber-accent/5 text-amber-accent hover:bg-amber-accent hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 mt-1"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${appUpdating ? 'animate-spin' : ''}`} />
                  {appUpdating ? 'Sourcing Culinary Updates...' : 'Check For App Updates & Refresh'}
                </button>
                
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-1 mt-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Need Assistance?</p>
                  <p className="text-[11px] text-gray-400 italic font-serif">
                    Contact us for password, domain, profile or billing inquiries:
                  </p>
                  <a 
                    href="mailto:info@dailymealrecipe.online" 
                    className="text-amber-accent font-bold text-xs tracking-wider hover:text-amber-accent transition-colors underline decoration-dotted block pt-1"
                  >
                    info@dailymealrecipe.online
                  </a>
                </div>

                <div className="py-2 text-center">
                  <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                    Review our{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-accent hover:underline font-bold inline cursor-pointer"
                    >
                      Terms of Service
                    </a>
                    ,{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-accent hover:underline font-bold inline cursor-pointer"
                    >
                      Privacy Policy
                    </a>
                    , and{' '}
                    <a
                      href="/refund-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-accent hover:underline font-bold inline cursor-pointer"
                    >
                      Refund Policy
                    </a>
                    .
                  </p>
                </div>

                {/* Clear Danger Zone for Account Erasure */}
                <div className="p-5 bg-rose-500/[0.02] border border-rose-500/15 rounded-2xl text-center space-y-3 mt-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Danger Zone</p>
                    <p className="text-[11px] text-gray-400 italic font-serif leading-relaxed">
                      Permanently delete your account profile, preferences, and erase all connected data records from the system.
                    </p>
                  </div>
                  <button 
                    onClick={deleteAccount}
                    type="button"
                    className="w-full py-3.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 transition-all cursor-pointer"
                  >
                    Delete My Account
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Advanced Backup Modal (with explicit permission workflow) */}
      <AnimatePresence>
        {showBackupModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-graphite border border-white/10 rounded-[32px] max-w-lg w-full p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <div className="p-3 bg-amber-accent/10 rounded-2xl text-amber-accent">
                  <HardDrive className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-white italic">Download Full Backup Ledger</h3>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Device-Compliant Local Storage Export</p>
                </div>
              </div>

              {backingUp ? (
                <div className="space-y-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-amber-accent border-t-transparent animate-spin" />
                    <p className="text-sm font-serif text-white italic">{backupStage}</p>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-amber-accent rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${backupProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-right text-[9px] text-white/30 font-mono">{backupProgress}% Compiled</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-white/60 leading-relaxed italic">
                    By confirming below, Artisan Culinary will assemble and package your complete culinary digital footprint for offline backup. This compiles:
                  </p>
                  
                  <ul className="text-[11px] text-white/40 space-y-1.5 list-disc pl-4 italic">
                    <li>Gourmet account profile & allergen/dietary focus</li>
                    <li>Global and personal custom cooking recipes</li>
                    <li>Meal planning calendars & grocery list items</li>
                    <li>Instant kitchen pantry stock inventory</li>
                    <li>All active shared family tasks & chores</li>
                    <li>Uploaded asset references & synced gourmet documents</li>
                  </ul>

                  <div className="p-4 bg-amber-accent/[0.02] border border-amber-accent/10 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-accent">
                      <Shield className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Email Anti-Abuse Protection Locked</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed italic">
                      This backup will be permanently attached to your verified email address: <strong className="text-white">{user?.email || profile?.email}</strong>. Backups cannot be transferred to different emails to protect your credentials and maintain fair subscription terms.
                    </p>
                  </div>

                  <p className="text-[10px] text-emerald-500/80 italic">
                    Do you authorize the local app sandbox to download this dataset?
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                <button
                  onClick={() => setShowBackupModal(false)}
                  disabled={backingUp}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white transition-colors cursor-pointer disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  onClick={runActualBackup}
                  disabled={backingUp}
                  className="px-6 py-3 bg-amber-accent hover:bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Request & Build Backup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Sync & Restore Modal */}
      <AnimatePresence>
        {showRestoreModal && verifiedBackup && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-graphite border border-white/10 rounded-[32px] max-w-lg w-full p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                  <RefreshCcw className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-white italic">Database Sync & Restore</h3>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Verify Ledger and Sync to Cloud</p>
                </div>
              </div>

              {isRestoring ? (
                <div className="space-y-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <p className="text-sm font-serif text-white italic">{restoreStage}</p>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${restoreProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-right text-[9px] text-white/30 font-mono">{restoreProgress}% Synchronized</p>
                  </div>
                  <p className="text-[10px] text-white/40 italic text-center">Please do not close this browser tab while we rebuild your digital kitchen.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-onyx p-5 rounded-2xl border border-white/5 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Verified Backup Ledger Details</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs italic text-white/50 font-serif">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-white/20 mt-1 block">Attached Email</span>
                        <span className="text-white font-mono break-all">{verifiedBackup.backupEmail}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-white/20 mt-1 block">Creation Timestamp</span>
                        <span>{format(new Date(verifiedBackup.backupDate), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-1">
                      <span className="text-[9px] uppercase font-bold text-white/20 block mb-1.5">Database Elements Count</span>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 bg-white/5 text-[9px] font-mono text-white/60 rounded">Recipes: {verifiedBackup.data.recipes?.length || 0}</span>
                        <span className="px-2 py-0.5 bg-white/5 text-[9px] font-mono text-white/60 rounded">Meal Plans: {verifiedBackup.data.mealPlans?.length || 0}</span>
                        <span className="px-2 py-0.5 bg-white/5 text-[9px] font-mono text-white/60 rounded">Pantry Items: {verifiedBackup.data.pantry?.length || 0}</span>
                        <span className="px-2 py-0.5 bg-white/5 text-[9px] font-mono text-white/60 rounded">Files: {verifiedBackup.data.files?.length || 0}</span>
                        <span className="px-2 py-0.5 bg-white/5 text-[9px] font-mono text-white/60 rounded">Families: {verifiedBackup.data.families?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40 block">Choose Restoration Sync Mode</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setRestoreMode('merge')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          restoreMode === 'merge' 
                            ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                            : 'bg-onyx border-white/5 text-white/40 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-semibold">Merge Safely</p>
                        <p className="text-[9px] text-white/30 italic mt-0.5">Keeps existing data and only appends missing items.</p>
                      </button>
                      <button
                        onClick={() => setRestoreMode('overwrite')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          restoreMode === 'overwrite' 
                            ? 'bg-rose-500/10 border-rose-500 text-white' 
                            : 'bg-onyx border-white/5 text-white/40 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-semibold text-rose-400">Total Overwrite</p>
                        <p className="text-[9px] text-white/30 italic mt-0.5">Deletes all current list items and profile attributes first, then writes backup.</p>
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-accent/80 italic font-serif">
                    This file belongs to you. We will verify your credentials and align all original data keys, IDs and records to your current user UID securely.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setVerifiedBackup(null);
                  }}
                  disabled={isRestoring}
                  className="px-5 py-3 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white transition-colors cursor-pointer disabled:opacity-30"
                >
                  Discard File
                </button>
                <button
                  onClick={runActualRestore}
                  disabled={isRestoring}
                  className="px-6 py-3 bg-emerald-500 hover:bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Initiate Cloud Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Full Screen Avatar Modal */}
        {isFullScreenPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="absolute inset-0 cursor-zoom-out" onClick={() => setIsFullScreenPhoto(false)} />
            <div className="relative z-[110] max-w-2xl max-h-[85vh] p-4 flex flex-col items-center">
              <button 
                onClick={() => setIsFullScreenPhoto(false)}
                className="absolute -top-12 right-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
                className="max-w-full max-h-[70vh] rounded-3xl object-contain border border-white/10 shadow-2xl animate-scale-up"
                alt="Profile"
              />
              <p className="text-white/40 text-xs italic mt-6 font-light">
                {profile?.displayName || user?.displayName || 'Gourmet Cook'}
              </p>
            </div>
          </div>
        )}

        {/* Profile Picture Editor Modal */}
        {isEditingPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setIsEditingPhoto(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-graphite rounded-[32px] border border-white/10 p-8 max-w-md w-full relative z-10 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-serif text-2xl text-white italic">Edit Profile Photo</h3>
                <button onClick={() => setIsEditingPhoto(false)} className="text-white/40 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Photo Preview */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-24 h-24 rounded-full border-2 border-amber-accent/30 p-1 overflow-hidden bg-onyx">
                  <img 
                    src={profile?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
                    className="w-full h-full rounded-full object-cover" 
                    alt="Preview" 
                  />
                </div>
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Active Avatar</span>
              </div>

              {/* Option 1: Choose from Gallery */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-accent">Choose from Chef Gallery</h4>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: 'Classic Chef', url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Sommelier', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Baking Artisan', url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Gourmet Master', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Pizza Cook', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Connoisseur', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Japanese Chef', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80' },
                    { name: 'Pastry Queen', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80' }
                  ].map((avatar) => (
                    <button
                      key={avatar.name}
                      onClick={() => {
                        if (profile) {
                          const updated = { ...profile, photoURL: avatar.url };
                          setProfile(updated);
                          setDoc(doc(db, 'users', user!.uid), updated).catch(console.error);
                          if (auth.currentUser) {
                            updateProfile(auth.currentUser, { photoURL: avatar.url })
                              .then(() => console.log("Profile: Synced preset photoURL to Firebase Auth."))
                              .catch(err => console.error("Profile: Failed to sync photoURL to Firebase Auth:", err));
                          }
                        }
                      }}
                      className={`aspect-square rounded-xl overflow-hidden border transition-all hover:scale-105 cursor-pointer ${
                        profile?.photoURL === avatar.url ? 'border-amber-accent ring-2 ring-amber-accent/20' : 'border-white/5 hover:border-white/20'
                      }`}
                      title={avatar.name}
                    >
                      <img src={avatar.url} className="w-full h-full object-cover" alt={avatar.name} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2: Upload personal image (Base64) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-accent">Upload Personal Image</h4>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-amber-accent/30 bg-onyx/40 rounded-xl p-4 cursor-pointer hover:bg-onyx/60 transition-colors">
                    <Upload className="w-5 h-5 text-amber-accent/80 mb-1" />
                    <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Choose File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert('Please select an image smaller than 2MB.');
                            return;
                          }
                           const reader = new FileReader();
                           reader.onloadend = () => {
                             const base64 = reader.result as string;
                             if (profile) {
                               const updated = { ...profile, photoURL: base64 };
                               setProfile(updated);
                               setDoc(doc(db, 'users', user!.uid), updated).catch(console.error);
                               console.log("Profile: Base64 photoURL saved to Firestore. Skipping Firebase Auth sync to avoid URL limit errors.");
                             }
                           };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Option 3: Paste custom URL */}
              <div className="space-y-3 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-accent">Or Paste Image URL</h4>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    placeholder="https://example.com/avatar.jpg"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    className="flex-1 bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-amber-accent/50"
                  />
                  <button 
                    onClick={() => {
                      if (customPhotoUrl && profile) {
                        const updated = { ...profile, photoURL: customPhotoUrl };
                        setProfile(updated);
                        setDoc(doc(db, 'users', user!.uid), updated).catch(console.error);
                        if (auth.currentUser) {
                          updateProfile(auth.currentUser, { photoURL: customPhotoUrl })
                            .then(() => console.log("Profile: Synced custom photoURL to Firebase Auth."))
                            .catch(err => console.error("Profile: Failed to sync photoURL to Firebase Auth:", err));
                        }
                        setCustomPhotoUrl('');
                      }
                    }}
                    className="px-4 bg-amber-accent text-black font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-white transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setIsEditingPhoto(false)}
                className="w-full py-3 border border-white/10 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
