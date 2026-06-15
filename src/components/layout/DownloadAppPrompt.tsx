import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Smartphone, 
  QrCode, 
  Share, 
  PlusSquare, 
  Sparkles, 
  Copy, 
  Check, 
  Laptop,
  RefreshCw,
  Monitor,
  Info
} from 'lucide-react';

interface DownloadAppPromptProps {
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

export default function DownloadAppPrompt({ forceOpen = false, onCloseForce }: DownloadAppPromptProps) {
  // Overarching visibility states
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSTooltip, setShowIOSTooltip] = useState(false);
  const [canShowInstallButton, setCanShowInstallButton] = useState(false);
  
  // Storage and setup
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // OS and mode detection states
  const [os, setOs] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);

  const appUrl = window.location.origin;
  const logoUrl = "https://plain-eeur-prod-public.komododecks.com/202606/11/W44EwPiBLuI73qacWwCj/image.png"; // Using our official master logo asset reference
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=245-158-11&bgcolor=15-15-15&qzone=2&data=${encodeURIComponent(appUrl)}`;

  useEffect(() => {
    // 1. Detect Standalone Mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };
    const standalone = checkStandalone();

    // 2. Detect Operating System
    const detectOS = () => {
      const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
      
      // iOS detection
      const isIos = /iphone|ipad|ipod/i.test(userAgent) || 
        (navigator.userAgent.includes("Mac") && "ontouchend" in document);
      
      if (isIos) {
        setOs('ios');
        return 'ios';
      }
      
      // Android detection
      const isAndroid = /android/i.test(userAgent);
      if (isAndroid) {
        setOs('android');
        return 'android';
      }

      // Default to Desktop/Laptop for other major web platforms
      setOs('desktop');
      return 'desktop';
    };
    const userOS = detectOS();

    // 3. Native install prompt handler for Android / PC Desktop Web browser
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check and dynamic tooltip/modal trigger
    if (!standalone) {
      // Delay prompt entry slightly to let page contents load elegantly
      const timer = setTimeout(() => {
        const lastDismissed = localStorage.getItem('pwa_prompt_dismissed_at');
        const now = Date.now();
        const triggerCooldown = 1000 * 60 * 60; // 1 hour cool off

        if (!lastDismissed || (now - parseInt(lastDismissed, 10)) > triggerCooldown) {
          if (userOS === 'ios') {
            setShowIOSTooltip(true);
          } else {
            setIsOpen(true);
          }
        }
      }, 5000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  // Sync forced trigger (e.g. clicking "Download App" inside navigation bar)
  useEffect(() => {
    if (forceOpen) {
      if (os === 'ios') {
        setShowIOSTooltip(true);
      } else {
        setIsOpen(true);
      }
    }
  }, [forceOpen, os]);

  const handleDismissMainRoute = () => {
    setIsOpen(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
    if (onCloseForce) onCloseForce();
  };

  const handleDismissIOSTooltip = () => {
    setShowIOSTooltip(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
    if (onCloseForce) onCloseForce();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Standalone installation trigger
  const handleInstallApp = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setSyncProgress(15);

    // Seed offline assets and progress meter visually
    try {
      const cache = await caches.open('daily-meal-v2');
      await cache.addAll(['/', '/index.html', '/manifest.json', '/logo.svg']).catch(() => {});
      setSyncProgress(65);
    } catch (e) {
      // Graceful fallback for browsers block caches inside sandbox
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA Native Prompt] User Selection result: ${outcome}`);
        setDeferredPrompt(null);
        setCanShowInstallButton(false);
      } catch (err) {
        console.warn("Could not invoke beforeinstallprompt interface:", err);
      }
    } else {
      // Manual browser fallback messaging
      alert("To install standalone: click your browser's menu button (such as ⋮ or ⊞) in the utility bar and select 'Install' or 'Add to Home Screen'.");
    }

    setSyncProgress(100);
    setTimeout(() => {
      setIsDownloading(false);
      setSyncProgress(0);
      handleDismissMainRoute();
    }, 800);
  };

  return (
    <>
      {/* iOS Gentle, Elegant Bottom Tooltip Overlay */}
      <AnimatePresence>
        {showIOSTooltip && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[100] bg-coal border border-amber-accent/20 rounded-2xl shadow-2xl p-4 selection:bg-amber-accent/10"
          >
            <div className="flex items-start gap-3.5 relative">
              <div className="p-2.5 bg-amber-accent/10 border border-amber-accent/20 rounded-xl text-amber-accent shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1 pr-6">
                <h4 className="font-serif text-sm font-semibold text-white tracking-wide">
                  Install Daily Meal App
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Install this app on your iPhone: Tap the Share button <Share className="w-3.5 h-3.5 inline mx-0.5 text-amber-accent" /> below, then select <span className="text-white font-medium">"Add to Home Screen"</span>.
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleDismissIOSTooltip}
                className="absolute top-0 right-0 p-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/40 uppercase font-bold tracking-wider pt-2 border-t border-white/5">
              <span>Apple Safari Optimized</span>
              <span>Standalone Launch</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Install Companion Modal for Android / PC / Laptop Devices */}
      <AnimatePresence>
        {isOpen && !isStandalone && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Ambient Darkened Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={handleDismissMainRoute}
              className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            />

            {/* Premium PWA Info & Install Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-md bg-coal border border-white/10 rounded-[30px] overflow-hidden shadow-2xl p-6 md:p-8 text-center"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismissMainRoute}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/5 hover:border-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon / Brand Header */}
              <div className="flex flex-col items-center mt-2 mb-6">
                <div className="relative mb-3.5">
                  <img
                    src={logoUrl}
                    alt="Daily Meal Premium PWA Logo"
                    className="w-16 h-16 rounded-2xl shadow-xl border border-white/10 object-cover bg-black"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=120&q=80";
                    }}
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 p-1 bg-amber-accent text-black rounded-lg border border-coal shadow-md">
                    {os === 'desktop' ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <span className="text-[9px] uppercase tracking-widest font-black text-amber-accent bg-amber-accent/10 px-2.5 py-1 rounded-full mb-3">
                  COMPANION APPLICATION READY
                </span>
                
                <h3 className="font-serif text-2xl text-white font-medium tracking-tight">
                  Daily Meal Planner
                </h3>
                <p className="text-xs text-white/60 leading-relaxed max-w-xs mt-2.5">
                  Unlock immersive standalone layouts, quick launch desktop shortcuts, and fast offline recipe access matching your personalized schedule.
                </p>
              </div>

              {/* Install Action & Custom Interaction Button */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleInstallApp}
                  disabled={isDownloading}
                  className="w-full py-4 bg-amber-accent hover:bg-white text-black rounded-2xl text-xs uppercase font-black tracking-widest transition-all shadow-lg shadow-amber-accent/10 flex flex-col items-center justify-center gap-1 cursor-pointer disabled:bg-amber-accent/40 group font-sans border-0"
                >
                  {isDownloading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Seeding Core Cache... {syncProgress}%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 shrink-0 transition-transform group-hover:translate-y-0.5" />
                      <span>Install Companion App</span>
                    </div>
                  )}
                </button>

                {/* QR Code Presentation for Desktop */}
                {os === 'desktop' && (
                  <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                    <div className="relative p-2 bg-[#0f0f0f] rounded-2xl border border-white/10 shadow-lg mb-2">
                      <img 
                        src={qrImageUrl} 
                        className="w-28 h-28 object-cover rounded-xl"
                        alt="Scan QR code to install" 
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[9px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1.5">
                      <QrCode className="w-3 h-3 text-amber-accent" /> Scan to launch instantly on mobile
                    </span>
                  </div>
                )}

                {/* Android explicit support state */}
                {os === 'android' && (
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2.5 text-left">
                    <Info className="w-4 h-4 text-amber-accent shrink-0 mt-0.5" />
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      This progressive app supports instant home screen shortcutting, quick standalone multitasking, and native app integration on your Android device.
                    </p>
                  </div>
                )}

                {/* Copy Link field for quick sharing */}
                <div className="flex items-center bg-black/40 border border-white/5 rounded-xl overflow-hidden p-1">
                  <input 
                    type="text" 
                    readOnly 
                    value={appUrl} 
                    className="bg-transparent text-[9px] text-white/50 font-mono flex-1 outline-none px-2 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    aria-label="Copy application domain URL"
                    className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                      isCopied ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
