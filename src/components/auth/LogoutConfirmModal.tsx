import { motion, AnimatePresence } from 'motion/react';
import { X, LogOut, ChevronRight } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm shadow-2xl"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative max-w-md w-full bg-[#141414] border border-white/5 rounded-[40px] p-8 md:p-10 shadow-3xl text-center overflow-hidden z-10"
        >
          {/* Subtle Top Accent line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500/20 via-rose-500 to-amber-500/20" />

          {/* Decorative Glowing Orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[60px] -mr-16 -mt-16 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-accent/5 blur-[60px] -ml-16 -mb-16 rounded-full pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/5 animate-pulse">
              <LogOut className="w-8 h-8 text-rose-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-white font-serif text-3xl italic">
                Sign Out?
              </h2>
              <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-rose-400">
                Confirm De-Authentication
              </p>
            </div>

            <p className="text-sm text-gray-400 italic font-light leading-relaxed px-2">
              Are you sure you want to log out of your Daily Meal Recipe account? You will need to sign back in to access your saved recipes, customized weekly calendars, real-time shared kitchen chores, and personalized AI assistants.
            </p>

            <div className="w-full pt-4 border-t border-white/5 flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-rose-500/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Now
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-full h-14 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center transition-all cursor-pointer"
              >
                Cancel & Keep Cooking
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
