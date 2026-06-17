/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Discovery from './pages/Discovery';
import Generator from './pages/Generator';
import MealPlanner from './pages/MealPlanner';
import ShoppingList from './pages/ShoppingList';
import RecipeDetails from './pages/RecipeDetails';
import Pantry from './pages/Pantry';
import GuidedCooking from './pages/GuidedCooking';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import Scanner from './pages/Scanner';
import Admin from './pages/Admin';
import Leaderboard from './pages/Leaderboard';
import Auth from './pages/Auth';
import SharedTodos from './pages/SharedTodos';
import CompleteProfile from './pages/CompleteProfile';
import FilesHub from './pages/FilesHub';
import ComplianceHub from './pages/ComplianceHub';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import { motion, AnimatePresence } from 'motion/react';
import PullToRefresh from './components/layout/PullToRefresh';

import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';
import SubscriptionGuard from './components/auth/SubscriptionGuard';
import { ChefHat, Sparkles } from 'lucide-react';
import { BackgroundJobProvider, BackgroundJobDeck } from './lib/BackgroundJobContext';
import DownloadAppPrompt from './components/layout/DownloadAppPrompt';
import { ErrorUXProvider } from './lib/ErrorUXContext';

// A culinary-themed branded splash loading experience
function BrandedSplash() {
  const captions = [
    "Preheating backend ovens...",
    "Sourcing handpicked ingredients...",
    "Arranging your personalized pantry...",
    "Polishing the custom silverware...",
    "Curating seasonal gourmet designs..."
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % captions.length);
    }, 1300);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black selection:bg-amber-accent/20">
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center space-y-10">
        
        {/* Pulsing glowing ambient element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120%] w-36 h-36 bg-amber-accent/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative">
          {/* Outer rotating dash rim */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full border border-dashed border-amber-accent/30 flex items-center justify-center"
          />
          {/* Inner pulsing chef hat icon */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ChefHat className="w-9 h-9 text-amber-accent" />
          </motion.div>
        </div>

        {/* Branding text */}
        <div className="space-y-3">
          <h2 className="font-serif text-2xl text-white tracking-widest font-normal uppercase">
            DAILY MEAL <span className="italic text-amber-accent text-2xl font-light">Recipe</span>
          </h2>
          {/* Transitioning status caption */}
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-[11px] uppercase font-black tracking-widest text-amber-accent/80 flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-amber-accent animate-pulse" />
                {captions[index]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Delicate subtle loading progress bar */}
        <div className="w-48 h-0.5 bg-white/5 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-amber-accent rounded-full animate-[shimmer_1.5s_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  useEffect(() => {
    // Sync theme from profile or local storage
    const currentTheme = profile?.themePreference || localStorage.getItem('theme_pref') || 'dark';
    if (currentTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [profile?.themePreference]);

  useEffect(() => {
    if (!user) return;

    // Background sync: Keep a local safety copy of the user's recipes
    const syncRecipes = async () => {
      try {
        const q = query(
          collection(db, 'recipes'),
          where('authorId', '==', user.uid),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort in memory to stay index-independent
        recipes.sort((a: any, b: any) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        // ONLY update the safety backup if we actually fetched something to prevent overwriting with "nothing"
        // if a temporary network fluke or Firestore indexing delay happens.
        if (recipes.length > 0) {
          localStorage.setItem(`safety_backup_${user.uid}`, JSON.stringify(recipes));
          console.log(`[Safety Sync] Backed up ${recipes.length} recipes.`);
        }
      } catch (e) {
        console.warn("Safety sync failed - using previous cache", e);
      }
    };

    syncRecipes();
    const interval = setInterval(syncRecipes, 1000 * 60 * 5); // Every 5 minutes
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return <BrandedSplash />;
  }

  const isPublicPath = location.pathname === '/privacy' || location.pathname === '/terms' || location.pathname === '/refund-policy';

  if (!user && !isPublicPath) {
    return (
      <div className="min-h-screen bg-onyx flex flex-col justify-center py-12">
        <Auth />
      </div>
    );
  }

  if (user && profile && profile.isProfileComplete === false && !isPublicPath) {
    return (
      <div className="min-h-screen bg-onyx flex flex-col justify-center py-12">
        <CompleteProfile profile={profile} />
      </div>
    );
  }

  return (
    <PullToRefresh>
      <div className="min-h-screen bg-onyx flex flex-col text-gray-300">
        <Navbar onOpenDownload={() => setIsDownloadOpen(true)} />
        <main className={`flex-1 w-full max-w-7xl xxl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] mx-auto ${location.pathname === '/' ? 'px-1 xs:px-2' : 'px-3 xs:px-4'} sm:px-6 pt-6 pb-20 md:py-12`}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route 
                path="/discover" 
                element={
                  <SubscriptionGuard>
                    <Discovery />
                  </SubscriptionGuard>
                } 
              />
              <Route 
                path="/generate" 
                element={
                  user ? (
                    <SubscriptionGuard>
                      <Generator />
                    </SubscriptionGuard>
                  ) : <Navigate to="/" />
                } 
              />
              <Route 
                path="/planner" 
                element={
                  user ? (
                    <SubscriptionGuard>
                      <MealPlanner />
                    </SubscriptionGuard>
                  ) : <Navigate to="/" />
                } 
              />
              <Route 
                path="/shopping" 
                element={
                  user ? (
                    <SubscriptionGuard>
                      <ShoppingList />
                    </SubscriptionGuard>
                  ) : <Navigate to="/" />
                } 
              />
              <Route 
                path="/shared-todos" 
                element={
                  user ? (
                    <SubscriptionGuard>
                      <SharedTodos />
                    </SubscriptionGuard>
                  ) : <Navigate to="/" />
                } 
              />
              <Route 
                path="/pantry" 
                element={
                  user ? (
                    <SubscriptionGuard>
                      <Pantry />
                    </SubscriptionGuard>
                  ) : <Navigate to="/" />
                } 
              />
              <Route 
                path="/files" 
                element={
                  user ? (
                    <SubscriptionGuard>
                      <FilesHub />
                    </SubscriptionGuard>
                  ) : <Navigate to="/" />
                } 
              />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
              <Route path="/subscription" element={user ? <Subscription /> : <Navigate to="/" />} />
              <Route path="/recipe/:id" element={<RecipeDetails />} />
              <Route path="/guided/:id" element={<GuidedCooking />} />
              <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/" />} />
              <Route path="/admin" element={user && user.email === 'lewisiraki1@gmail.com' ? <Admin /> : <Navigate to="/" />} />
              <Route path="/compliance" element={user && user.email === 'lewisiraki1@gmail.com' ? <ComplianceHub /> : <Navigate to="/" />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/refund-policy" element={<RefundPolicyPage />} />
              <Route 
                path="/scanner" 
                element={
                  <SubscriptionGuard>
                    <Scanner />
                  </SubscriptionGuard>
                } 
              />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
        <BackgroundJobDeck />
        <DownloadAppPrompt forceOpen={isDownloadOpen} onCloseForce={() => setIsDownloadOpen(false)} />
      </div>
    </PullToRefresh>
  );
}

export default function App() {
  return (
    <Router>
      <ErrorUXProvider>
        <BackgroundJobProvider>
          <AppContent />
        </BackgroundJobProvider>
      </ErrorUXProvider>
    </Router>
  );
}

