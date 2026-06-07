import { useState, useEffect, useRef } from 'react';
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
  HelpCircle,
  ExternalLink,
  Laptop,
  Map,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  Terminal,
  RefreshCw,
  Server,
  WifiOff,
  Radio,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../lib/useAuth';

interface DownloadAppPromptProps {
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

export default function DownloadAppPrompt({ forceOpen = false, onCloseForce }: DownloadAppPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isIOS, setIsIOS] = useState(false);

  // Logo specifications
  const logoUrl = "https://kicksplug.shop/wp-content/uploads/2026/05/logo.png";
  const appUrl = window.location.origin;

  useEffect(() => {
    // 1. Detect standalone app mode
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    // 2. Capture native browser install prompt event
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // 3. Detect iOS specifically
    const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera;
    const isIosDevice = /iphone|ipad|ipod/i.test(userAgent);
    setIsIOS(isIosDevice);

    if (!checkStandalone) {
      const timer = setTimeout(() => {
        const lastDismissed = localStorage.getItem('pwa_prompt_dismissed_at');
        const now = Date.now();
        const oneHour = 1000 * 60 * 60;

        if (!lastDismissed || (now - parseInt(lastDismissed, 10)) > oneHour) {
          setIsOpen(true);
        }
      }, 6000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      };
    }
  }, []);

  // Monitor force open trigger
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
    if (onCloseForce) onCloseForce();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // One simple click action: runs native install and pre-caches the full application instantly
  const handleInstallAndSync = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setSyncProgress(10);

    // 1. Populate native web storage & caches immediately
    try {
      const cache = await caches.open('daily-meal-v2');
      await cache.addAll(['/', '/index.html', '/manifest.json', '/logo.svg']).catch(() => {});
      localStorage.setItem('offline_recipes_seeded', 'true');
      localStorage.setItem('offline_pack_downloaded', 'true');
    } catch {
      // Graceful fallback if caches is not supported in the exact sandbox iframe environment
    }

    setSyncProgress(50);

    // 2. Trigger native app standalone package installation prompt
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Native install prompt choice: ${outcome}`);
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("Prompt trigger error:", err);
      }
    } else if (isIOS) {
      alert("To make this a standalone app on iOS:\n1. Tap the Share button in Safari\n2. Scroll down & select 'Add to Home Screen'.");
    } else {
      // Standard browser prompt or manual placement support
      const promptStyle = window.matchMedia('(display-mode: standalone)').matches;
      if (!promptStyle) {
        alert("To install as a dedicated app:\nClick your browser's menu (⋮ or ⊞) and select 'Install' or 'Add to Home Screen'.");
      }
    }

    setSyncProgress(100);
    setTimeout(() => {
      setIsDownloading(false);
      setSyncProgress(0);
      handleDismiss();
    }, 800);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=245-158-11&bgcolor=15-15-15&qzone=2&data=${encodeURIComponent(appUrl)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Ambient Blurred Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Simplified Premium Direct Download Card Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-coal border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-6 md:p-8 text-center"
          >
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/5 hover:border-white/10 text-white/50 hover:text-white transition-all cursor-pointer animate-none"
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Header Section */}
            <div className="flex flex-col items-center mt-2 mb-6">
              <img
                src={logoUrl}
                alt="Daily Meal Premium Logo"
                className="w-16 h-16 rounded-2xl shadow-xl border border-white/10 object-cover bg-black mb-4"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=120&q=80";
                }}
              />
              <span className="text-[9px] uppercase tracking-widest font-black text-amber-accent bg-amber-accent/10 px-2.5 py-1 rounded-full mb-2">
                NATIVE COMPANION DOWNLOAD
              </span>
              <h3 className="font-serif text-2xl text-white font-medium tracking-tight">Daily Meal Recipe</h3>
              <p className="text-xs text-white/60 leading-relaxed max-w-sm mt-3">
                Download the companion application natively for standalone launching and complete offline support.
              </p>
            </div>

            {/* Tap Action: Single Unified Button */}
            <div className="space-y-4">
              <button 
                type="button"
                onClick={handleInstallAndSync}
                disabled={isDownloading}
                className="w-full py-4 bg-amber-accent hover:bg-white text-black rounded-2xl text-xs uppercase font-black tracking-widest transition-all shadow-lg shadow-amber-accent/10 flex flex-col items-center justify-center gap-1 cursor-pointer disabled:bg-amber-accent/50 group"
              >
                {isDownloading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Synchronizing & Download... {syncProgress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 shrink-0 transition-transform group-hover:translate-y-0.5" />
                    <span>Install & Sync Companion App</span>
                  </div>
                )}
              </button>

              {isIOS && (
                <p className="text-[10px] text-amber-accent/70 font-semibold uppercase tracking-wider">
                  ⚠️ Tap Safari <Share className="w-3.5 h-3.5 inline text-[10px]" /> → "Add to Home Screen" to install on iOS
                </p>
              )}

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-4 bg-black/40 border border-white/5 rounded-2xl">
                <div className="relative p-2 bg-[#0f0f0f] rounded-2xl border border-white/10 shadow-lg mb-2">
                  <img 
                    src={qrImageUrl} 
                    className="w-32 h-32 object-cover rounded-xl"
                    alt="Scan App QR Code" 
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[9px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1">
                  <QrCode className="w-3 h-3 text-amber-accent" /> Scan with mobile to install directly
                </span>
              </div>

              {/* Copy URL line */}
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
  );
}
