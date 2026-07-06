import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, LogIn, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actionName?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  title = "Sign In Required",
  message,
  actionName = "access this premium feature"
}: AuthModalProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const handleSignIn = () => {
    onClose();
    navigate('/auth', { state: { from: location } });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative max-w-md w-full bg-coal border border-white/5 rounded-[40px] p-8 md:p-10 shadow-2xl text-center overflow-hidden z-10"
        >
          {/* Subtle Top Accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500/20 via-amber-accent to-rose-500/20" />

          {/* Decorative Glowing Orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-accent/10 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/5 blur-[60px] -ml-16 -mb-16 rounded-full pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-amber-accent/10 border border-amber-accent/25 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-accent/5">
              <Sparkles className="w-8 h-8 text-amber-accent" />
            </div>

            <div className="space-y-2">
              <h2 className="text-white font-serif text-3xl italic">
                {title}
              </h2>
              <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-amber-accent/70">
                Premium Cooking Feature
              </p>
            </div>

            <p className="text-sm text-gray-400 italic font-light leading-relaxed px-2">
              {message || `To ${actionName}, you'll need to sign in to your Daily Meal Recipe account.`}
            </p>

            <div className="w-full pt-4 border-t border-white/5 flex flex-col gap-3">
              <button
                onClick={handleSignIn}
                className="w-full h-14 bg-amber-accent hover:bg-white text-black rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-amber-accent/10"
              >
                <LogIn className="w-4 h-4" />
                Sign In / Sign Up
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full h-14 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center transition-all cursor-pointer"
              >
                Keep Browsing
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
