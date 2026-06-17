import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/useAuth';
import { signIn, signOut } from '../../lib/firebase';
import { 
  ChefHat, 
  Search, 
  Plus,
  Calendar, 
  ShoppingBag, 
  Sparkles, 
  User, 
  LogOut, 
  CreditCard, 
  Shield, 
  Trophy, 
  Menu, 
  X, 
  ChevronRight,
  Sparkle,
  Scale,
  ClipboardList,
  Smartphone,
  Download,
  Database,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function Navbar({ onOpenDownload }: { onOpenDownload?: () => void }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);
  }, []);

  // Desktop Navigation list
  const navItems = [
    { name: 'Discover', path: '/discover', icon: Search },
    { name: 'Scanner', path: '/scanner', icon: ChefHat },
    { name: 'Generator', path: '/generate', icon: Sparkles, auth: true },
    { name: 'Pantry', path: '/pantry', icon: ShoppingBag, auth: true },
    { name: 'Planner', path: '/planner', icon: Calendar, auth: true },
    { name: 'Shopping', path: '/shopping', icon: ShoppingBag, auth: true },
    { name: 'Family Hub', path: '/shared-todos', icon: ClipboardList, auth: true },
    { name: 'Gourmet Vault', path: '/files', icon: Database, auth: true },
  ];

  if (user?.email === 'lewisiraki1@gmail.com') {
    navItems.push({ name: 'Compliance', path: '/compliance', icon: Scale, auth: true });
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield, auth: true });
  }

  // Mobile fast-switching main bottom-bar tabs
  const mobileCoreTabs = [
    { name: 'Discover', path: '/discover', icon: Search },
    { name: 'Scanner', path: '/scanner', icon: ChefHat },
    { name: 'AI Gen', path: '/generate', icon: Sparkles },
    { name: 'Pantry', path: '/pantry', icon: ShoppingBag },
  ];

  // Mobile "More" sheet items
  const mobileMoreTabs = [
    { name: 'Meal Planner', path: '/planner', icon: Calendar },
    { name: 'Shopping List', path: '/shopping', icon: ShoppingBag },
    { name: 'Family Hub', path: '/shared-todos', icon: ClipboardList },
    { name: 'Gourmet Vault', path: '/files', icon: Database },
    { name: 'My Profile', path: '/profile', icon: User },
    { name: 'Subscription', path: '/subscription', icon: CreditCard },
  ];

  if (user?.email === 'lewisiraki1@gmail.com') {
    mobileMoreTabs.unshift({ name: 'Compliance Hub', path: '/compliance', icon: Scale });
    mobileMoreTabs.unshift({ name: 'Admin Hub', path: '/admin', icon: Shield });
  }

  return (
    <>
      {/* 1. DESKTOP HEADER & DESKTOP SUB-NAVBAR (Visible on Desktop / Large tablets, hidden on Mobile WebView/Browser) */}
      <nav className="hidden md:block bg-graphite border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-graphite/90">
        <div className="max-w-7xl mx-auto px-6">
          {/* Top Header Row */}
          <div className="h-20 flex items-center justify-between border-b border-white/5">
            <Link to="/" className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden rounded-2xl">
                <img
                  src="https://plain-eeur-prod-public.komododecks.com/202606/11/W44EwPiBLuI73qacWwCj/image.png"
                  alt="Daily Meal Logo"
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-tight text-white leading-none">Daily Meal Recipe</span>
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-accent/50 mt-1">Culinary Mastery</span>
              </div>
            </Link>

            <div className="flex items-center gap-6">
              {/* Premium Install Companion App shortcut */}
              {!isStandalone && (
                <button
                  onClick={onOpenDownload}
                  className="flex items-center gap-2 px-4.5 py-2.5 bg-white/[0.03] hover:bg-amber-accent/15 border border-white/5 hover:border-amber-accent/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-accent transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                  title="Download App on Desktop & Mobile"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-accent" />
                  <span>Get App</span>
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-4 bg-onyx px-5 py-2.5 rounded-2xl border border-white/5 shadow-inner">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">{user.displayName}</span>
                    <button
                      onClick={() => signOut()}
                      className="text-[9px] uppercase tracking-widest text-amber-accent/60 hover:text-amber-accent font-bold transition-colors cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                  <Link to="/profile" className="relative group shrink-0">
                    <img 
                      src={profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                      className="w-10 h-10 rounded-full border-2 border-white/10 group-hover:border-amber-accent transition-all duration-300 object-cover"
                      alt="Profile"
                    />
                    <div className="absolute inset-0 rounded-full bg-amber-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="px-8 py-3 bg-amber-accent text-black rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-amber-accent/10 active:scale-95 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation Row */}
          <div className="h-14 flex items-center justify-start xl:justify-center overflow-x-auto no-scrollbar px-4 xl:px-0">
            <div className="flex items-center gap-4 lg:gap-8 xl:gap-10 min-w-max">
              {navItems.map((item) => {
                if (item.auth && !user) return null;
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "relative flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all py-4 hover:translate-y-[-1px]",
                      isActive ? "text-amber-accent scale-105" : "text-white/30 hover:text-white"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-[-4px] right-[-4px] h-[3px] bg-amber-accent rounded-full shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. MOBILE TOP FLOATING HEADER (Optimized for Mobile Browsers & Native Apps) */}
      <header className="md:hidden bg-graphite/90 border-b border-white/5 sticky top-0 z-40 backdrop-blur-md px-6 py-5.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src="https://plain-eeur-prod-public.komododecks.com/202606/11/W44EwPiBLuI73qacWwCj/image.png"
              alt="Daily Meal Logo"
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold text-white leading-none">Daily Meal Recipe</span>
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-amber-accent/50">Culinary Hub</span>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <Link to="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-white/10 active:scale-90 transition-transform">
              <img 
                src={profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                className="w-full h-full object-cover" 
                alt="Profile"
              />
            </Link>
          </div>
        )}
      </header>

      {/* 3. MOBILE BOTTOM NAVIGATION SUITE (Ideal look and feel for Mobile App/Website) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-graphite/95 border-t border-white/5 backdrop-blur-lg pb-safe">
        <div className="grid grid-cols-5 h-16 items-center justify-around px-2">
          
          {/* Static Core Tabs */}
          {mobileCoreTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 text-[9px] font-bold uppercase tracking-wider transition-all",
                  isActive ? "text-amber-accent" : "text-white/30"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-all",
                  isActive ? "bg-amber-accent/10" : ""
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span>{tab.name}</span>
              </Link>
            );
          })}

          {/* Trigger Tab: "More Menu" */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center h-full gap-1 text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer",
              isMoreMenuOpen ? "text-amber-accent" : "text-white/30"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-all",
              isMoreMenuOpen ? "bg-amber-accent/10" : ""
            )}>
              <Menu className="w-5 h-5" />
            </div>
            <span>More</span>
          </button>
        </div>
      </div>

      {/* 4. PREMIUM Bottom-Sheet Overlay Modal for "More" Navigation options */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            {/* Backdrop slide-in */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black z-50 md:hidden"
            />

            {/* Bottom Sheet wrapper */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-coal border-t border-white/10 rounded-t-[32px] px-6 pt-5 pb-8 md:hidden shadow-2xl"
            >
              {/* Swipe Indicator Pill */}
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6" />

              {/* Sheet Title */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Sparkle className="w-4 h-4 text-amber-accent fill-amber-accent" />
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-white">Culinary Command</h3>
                </div>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-2 bg-white/5 border border-white/5 rounded-full text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {mobileMoreTabs.map((tab) => {
                  const isActive = location.pathname === tab.path;
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all text-xs font-semibold select-none",
                        isActive 
                          ? "bg-amber-accent/20 border-amber-accent text-amber-accent shadow-sm"
                          : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Logout Area inside native sheet */}
              {!isStandalone && (
                <div className="border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (onOpenDownload) onOpenDownload();
                    }}
                    className="w-full py-4 bg-amber-accent/10 hover:bg-amber-accent/15 text-amber-accent border border-amber-accent/20 rounded-2xl text-xs uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer mb-3.5"
                  >
                    <Download className="w-4 h-4" />
                    Download Phone App
                  </button>
                </div>
              )}

              {user && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      signOut();
                    }}
                    className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-xs uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out Account
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

