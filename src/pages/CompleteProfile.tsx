import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  ChefHat, 
  User as UserIcon, 
  Camera, 
  Upload, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompleteProfileProps {
  profile: UserProfile;
}

const PRESET_AVATARS = [
  { emoji: '🍳', label: 'Home Chef', bg: 'bg-amber-500/10 border-amber-500/20' },
  { emoji: '🍕', label: 'Pizzaiolo', bg: 'bg-orange-500/10 border-orange-500/20' },
  { emoji: '🧁', label: 'Baker', bg: 'bg-pink-500/10 border-pink-500/20' },
  { emoji: '🥑', label: 'Veganist', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { emoji: '🍣', label: 'Sushi Master', bg: 'bg-red-500/10 border-red-500/20' },
  { emoji: '🥗', label: 'Salad Lover', bg: 'bg-green-500/10 border-green-500/20' }
];

export default function CompleteProfile({ profile }: CompleteProfileProps) {
  const [role, setRole] = useState<'user' | 'seller'>('user');
  const [photoURL, setPhotoURL] = useState<string>(profile.photoURL || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsDialogType, setTermsDialogType] = useState<'terms' | 'privacy'>('terms');

  // Handle local picture upload with drag-and-drop or manual pick
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
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (emoji: string) => {
    // Canvas-drawn minimal food emoji avatar for extremely high quality base64 image
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1A1A1A';
      ctx.fillRect(0, 0, 150, 150);
      
      // Draw a gold metallic circular ring
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(75, 75, 68, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw Emoji
      ctx.font = '72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 75, 75);

      setPhotoURL(canvas.toDataURL('image/jpeg', 0.8));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to register.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const profileRef = doc(db, 'users', profile.uid);
      await updateDoc(profileRef, {
        role: role,
        photoURL: photoURL,
        isProfileComplete: true
      });
    } catch (err: any) {
      console.error('Error finalizing profile completion:', err);
      setError('Failed to update your preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-full max-w-xl bg-gradient-to-b from-coal to-graphite border border-white/[0.06] rounded-[40px] p-8 md:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-md">
        
        {/* Ambient Premium Orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-accent/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-accent/15 rounded-full blur-[80px]" />

        {/* Branding header */}
        <div className="text-center space-y-4 mb-8 relative z-10">
          <div className="inline-flex bg-gradient-to-br from-amber-accent to-amber-gold p-3.5 rounded-2xl mx-auto shadow-2xl shadow-amber-accent/20">
            <ChefHat className="w-7 h-7 text-black" />
          </div>
          <div className="space-y-1">
            <h2 className="font-serif text-3xl text-white italic tracking-tight">
              Complete Your Culinary Profile
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-accent/70">
              Welcome {profile.displayName}! Please share your details to proceed.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-start gap-3 relative z-10">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          {/* Section 1: Interactive Profile Pic / Avatar Upload */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
              Customize Your Profile Avatar
            </label>
            
            <div className="flex flex-col md:flex-row items-center gap-6 bg-white/[0.02] p-5 rounded-3xl border border-white/[0.05]">
              {/* Image Preview & Cam Launcher */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full border-2 border-amber-accent/30 overflow-hidden bg-black/50 flex items-center justify-center shadow-lg relative">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Avatar Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-white/20" />
                  )}
                  {/* Glass shimmer overlay */}
                  <div className="absolute inset-0 bg-white/5 pointer-events-none group-hover:opacity-0 transition-opacity" />
                </div>
                
                {/* Manual File input absolute trigger bubble */}
                <label className="absolute -bottom-1 -right-1 p-2 bg-amber-accent hover:bg-white text-black rounded-full cursor-pointer shadow-lg transition-all border border-black/10 duration-200 hover:scale-110 active:scale-95">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Upload Helper or Emoji Presets Selection right alongside */}
              <div className="flex-1 space-y-3 w-full">
                <p className="text-xs text-gray-400 leading-relaxed text-center md:text-left">
                  Google connected your base email profile. Customize your chef aesthetic by uploading an image or selecting a gourmet preset below:
                </p>

                {/* Preset Culinary Avatar Tokens */}
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.emoji}
                      type="button"
                      onClick={() => handleSelectPreset(preset.emoji)}
                      title={preset.label}
                      className={`h-10 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95 text-lg cursor-pointer ${preset.bg}`}
                    >
                      {preset.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Account Role Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
              Choose Culinary Target Role
            </label>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-4 border rounded-3xl text-xs uppercase tracking-wider transition-all text-center font-bold flex flex-col items-center gap-2 select-none active:scale-95 duration-200 cursor-pointer ${
                  role === 'user'
                    ? 'bg-amber-accent/15 border-amber-accent text-amber-accent shadow-lg shadow-amber-accent/5'
                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                <UserIcon className="w-5 h-5" />
                <span className="font-bold">Home Chef</span>
                <span className="text-[9px] opacity-60 font-medium normal-case block">Search, cook & favorite recipes</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`p-4 border rounded-3xl text-xs uppercase tracking-wider transition-all text-center font-bold flex flex-col items-center gap-2 select-none active:scale-95 duration-200 cursor-pointer ${
                  role === 'seller'
                    ? 'bg-amber-accent/15 border-amber-accent text-amber-accent shadow-lg shadow-amber-accent/5'
                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                <ChefHat className="w-5 h-5" />
                <span className="font-bold">Artisan (Seller)</span>
                <span className="text-[9px] opacity-60 font-medium normal-case block">Publish recipes & sell premium details</span>
              </button>
            </div>
          </div>

          {/* Section 3: Compliance & Document Review checkboxes */}
          <div className="flex items-start gap-3 p-4 bg-white/[0.01] border border-white/5 rounded-3xl select-none">
            <input
              id="complete-terms-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-4.5 h-4.5 accent-amber-accent mt-0.5 rounded border-white/10 bg-white/5 cursor-pointer"
            />
            <label htmlFor="complete-terms-checkbox" className="text-[11px] text-gray-400 leading-relaxed cursor-pointer">
              I acknowledge and agree to Daily Meal Recipe's{' '}
              <button
                type="button"
                onClick={() => {
                  setTermsDialogType('terms');
                  setShowTermsDialog(true);
                }}
                className="text-amber-accent hover:underline font-bold inline cursor-pointer"
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button
                type="button"
                onClick={() => {
                  setTermsDialogType('privacy');
                  setShowTermsDialog(true);
                }}
                className="text-amber-accent hover:underline font-bold inline cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-amber-accent hover:bg-white text-black hover:text-black rounded-2xl text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-accent/10 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration & Launch</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Modal overlays for terms and privacy policies */}
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
                  type="button"
                  onClick={() => setShowTermsDialog(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
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
                  </>
                ) : (
                  <>
                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">1. Data Collected</h4>
                    <p>
                      We process account credentials (emails, verification stamps) and metadata linked to your personal configuration, kitchen inventory, selected fitness objectives, and favorited dishes. This ensures cloud-synchronized state updates across devices.
                    </p>

                    <h4 className="text-white font-serif italic text-lg border-b border-white/5 pb-2">2. Processing Compliance</h4>
                    <p>
                      Daily Meal Recipe is fully compliant with modern data protection regulations including the EU General Data Regulation (GDPR) and California Consumer Privacy Act (CCPA). You hold complete control to export your profile information as JSON or submit requests for full account purging.
                    </p>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-slate-900 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Daily Meal Recipe Secure Verification
                </span>
                <button
                  type="button"
                  onClick={() => setShowTermsDialog(false)}
                  className="px-6 py-2.5 bg-amber-accent hover:bg-white text-black font-bold uppercase tracking-widest text-[10px] rounded-full transition-all cursor-pointer"
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
