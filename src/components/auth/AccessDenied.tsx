import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

interface AccessDeniedProps {
  message?: string;
}

export default function AccessDenied({ message = "You do not have the required permissions to access this page or resource." }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-graphite/40 border border-white/5 rounded-[40px] p-10 md:p-12 space-y-8 shadow-2xl backdrop-blur-md relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 blur-[80px] -mr-24 -mt-24 rounded-full pointer-events-none" />

        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/5">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <div className="space-y-3">
            <h1 className="text-white font-serif text-4xl italic leading-none">
              Access Denied
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-rose-400">
              Security Restriction
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-400 italic font-light leading-relaxed">
          {message}
        </p>

        <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full h-14 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full h-14 bg-amber-accent hover:bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-accent/5 cursor-pointer"
          >
            Go to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
