import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Check, 
  CreditCard, 
  Sparkles, 
  Clock, 
  Zap, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Info, 
  Calendar, 
  Printer, 
  X, 
  Award,
  Receipt,
  Terminal,
  Cpu,
  Database,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, SavedCard, BillingReceipt } from '../types';
import { Shimmer } from '../components/recipes/RecipeSkeleton';
import { useErrorUX, InlineErrorHelper } from '../lib/ErrorUXContext';

export default function Subscription() {
  const { user } = useAuth();
  const { handleError } = useErrorUX();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialSuccessMsg, setTrialSuccessMsg] = useState<string | null>(null);
  const [paystackKey, setPaystackKey] = useState<string | null>(null);
  const [isSecretKeyConfigured, setIsSecretKeyConfigured] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<BillingReceipt | null>(null);

  // States for Native Gourmet Interactive Checkout Popover
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<'subscribe' | 'link'>('subscribe');
  const [modalTheme, setModalTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (showPaymentModal) {
      const activeTheme = (profile?.themePreference || localStorage.getItem('theme_pref') || 'dark') as 'light' | 'dark';
      setModalTheme(activeTheme);
    }
  }, [showPaymentModal, profile]);

  const isModalLight = modalTheme === 'light';
  const modalHeadingColor = isModalLight ? '#000000' : '#ffffff';
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [paymentFormSuccess, setPaymentFormSuccess] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    async function checkVerificationCallback() {
      if (!user) return;
      const params = new URLSearchParams(window.location.search);
      const reference = params.get('reference') || params.get('trxref');
      
      if (reference) {
        setVerifyingPayment(true);
        setVerificationError(null);
        setVerificationSuccess(null);
        try {
          const response = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reference })
          });

          const resData = await response.json();
          if (!response.ok || resData.status !== 'success') {
            throw new Error(resData.error || 'Failed to verify transaction with the Paystack secure gateway.');
          }

          setVerificationSuccess(`Your payment of $${((resData.data?.amount || 500) / 100).toFixed(2)} was verified successfully! Reference: ${reference}.`);
          
          // Refresh user profile snap
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
          
          // Remove query params to prevent double submissions on page refresh
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (err: any) {
          console.error("Verification error:", err);
          setVerificationError(err?.message || 'Payment verification failed. Please contact customer support.');
        } finally {
          setVerifyingPayment(false);
        }
      }
    }
    checkVerificationCallback();
  }, [user]);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    async function fetchPaystackConfig() {
      try {
        const res = await fetch('/api/paystack/config');
        if (res.ok) {
          const data = await res.json();
          if (data.paystackPublicKey) {
            setPaystackKey(data.paystackPublicKey);
          }
          const hasSecret = !!data.isSecretKeyConfigured;
          setIsSecretKeyConfigured(hasSecret);
        }
      } catch (err) {
        console.error("Failed to fetch Paystack config:", err);
      }
    }
    loadProfile();
    fetchPaystackConfig();
  }, [user]);

  // Option 1: Start 1-Month Free Trial immediately
  const handleStartTrial = async () => {
    if (!user || !profile) return;
    setProcessing(true);
    setError(null);
    setTrialSuccessMsg(null);

    try {
      // Set trial end date to 14 days from now (2 weeks)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const trialSubscription = {
        status: 'trial',
        trialEndDate: trialEndDate.toISOString(),
        subscribedDate: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', user.uid), {
        subscription: trialSubscription
      });

      setProfile({
        ...profile,
        subscription: trialSubscription as any
      });

      setTrialSuccessMsg("Fantastic choice! Your 2-week free trial of Plus is now active!");
    } catch (err: any) {
      const friendlyVal = handleError(err, {
        componentName: 'Subscription',
        actionName: 'startTrial',
        preferredPlacement: 'inline'
      });
      setError(friendlyVal);
    } finally {
      setProcessing(false);
    }
  };

  // Option 2: Repurposed Paystack Checkout Subscription ($5/month) using Integrated Premium Modal
  const handlePaystackSubscribe = () => {
    if (!user || !profile) return;
    setError(null);
    setTrialSuccessMsg(null);
    setPaymentFormError(null);
    setPaymentFormSuccess(null);
    setPaymentModalType('subscribe');
    
    const uniqueKey = "idem-sub-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    setIdempotencyKey(uniqueKey);
    setShowPaymentModal(true);
  };

  // Option 3: Repurposed Link Card Securely using Integrated Premium Modal
  const handleLinkCard = () => {
    if (!user || !profile) return;
    setError(null);
    setTrialSuccessMsg(null);
    setPaymentFormError(null);
    setPaymentFormSuccess(null);
    setPaymentModalType('link');
    
    const uniqueKey = "idem-link-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
    setIdempotencyKey(uniqueKey);
    setShowPaymentModal(true);
  };

  // Real-time Paystack secure popup redirect checkout
  const handleRealPaystackPayment = async () => {
    if (!user || !profile) return;
    setProcessing(true);
    setPaymentFormError(null);
    setPaymentFormSuccess(null);

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey || ''
        },
        body: JSON.stringify({
          email: user.email,
          amount: paymentModalType === 'subscribe' ? 500 : 100, // $5.00 subscription, $1.00 linking verification
          idempotencyKey: idempotencyKey,
          callbackUrl: window.location.origin + '/subscription'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to initialize secure Paystack checkout transaction.`);
      }

      const resData = await response.json();
      if (resData.status === 'success' && resData.authorization_url) {
        setPaymentFormSuccess("Redirecting to the secure live Paystack payment gateway... Please authorize your payment there.");
        setTimeout(() => {
          // Redirect to the payment portal
          window.location.href = resData.authorization_url;
        }, 1500);
      } else {
        throw new Error("Paystack did not respond with a valid payment portal URL.");
      }
    } catch (err: any) {
      const errMsg = err?.message || "Secure live initialization failed.";
      setPaymentFormError(errMsg);
    } finally {
      setProcessing(false);
    }
  };

  // Option 4: Delete a saved validation card
  const handleDeleteCard = async (cardId: string) => {
    if (!user || !profile) return;
    setProcessing(true);
    setError(null);
    try {
      const existingMethods = profile.paymentMethods || [];
      const updatedPaymentMethods = existingMethods.filter((c: SavedCard) => c.id !== cardId);

      await updateDoc(doc(db, 'users', user.uid), {
        paymentMethods: updatedPaymentMethods
      });

      setProfile({
        ...profile,
        paymentMethods: updatedPaymentMethods
      });
      setTrialSuccessMsg("💳 Card credentials removed successfully from memory.");
    } catch (err: any) {
      const friendlyVal = handleError(err, {
        componentName: 'Subscription',
        actionName: 'deleteCard',
        preferredPlacement: 'inline'
      });
      setError(friendlyVal);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-20 py-12 animate-pulse">
      {/* Title block skeleton */}
      <div className="text-center space-y-6">
        <div className="h-16 w-80 bg-white/5 rounded-2xl mx-auto relative overflow-hidden">
          <Shimmer className="absolute inset-0 w-full h-full" />
        </div>
        <div className="h-6 w-96 bg-white/5 rounded-xl mx-auto relative overflow-hidden">
          <Shimmer className="absolute inset-0 w-full h-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left list of benefits skeleton */}
        <div className="space-y-10">
          <div className="space-y-4">
            <Shimmer className="h-10 w-48 rounded-lg" />
            <Shimmer className="h-5 w-64 rounded-lg" />
          </div>

          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 shrink-0 relative overflow-hidden">
                  <Shimmer className="absolute inset-0 w-full h-full" />
                </div>
                <div className="space-y-2 flex-grow">
                  <Shimmer className="h-5 w-40 rounded-lg" />
                  <Shimmer className="h-4 w-60 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right card skeleton */}
        <div className="bg-graphite p-12 rounded-[40px] border border-white/5 space-y-8 relative overflow-hidden">
          <div className="space-y-4">
            <Shimmer className="h-4 w-20 rounded-md" />
            <Shimmer className="h-12 w-48 rounded-lg" />
          </div>
          <div className="space-y-2 pt-4">
            <Shimmer className="h-12 w-28 rounded-lg" />
            <Shimmer className="h-4 w-36 rounded-md" />
          </div>
          <div className="pt-8 border-t border-white/5 space-y-6">
            <div className="h-14 bg-white/5 rounded-full relative overflow-hidden">
              <Shimmer className="absolute inset-0 w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const isSubscribed = profile?.subscription?.status === 'active';
  const isTrial = profile?.subscription?.status === 'trial';
  
  const rawMsLeft = profile?.subscription?.trialEndDate 
    ? new Date(profile.subscription.trialEndDate).getTime() - Date.now()
    : 0;
  
  const rawDaysLeft = Math.max(0, Math.ceil(rawMsLeft / (1000 * 60 * 60 * 24)));
  const trialDaysLeft = Math.min(14, rawDaysLeft);

  const getTrialCountdownText = () => {
    if (rawMsLeft <= 0) return "Trial Expired";
    const totalHours = Math.ceil(rawMsLeft / (1000 * 60 * 60));
    if (totalHours < 48) {
      if (totalHours < 2) {
        return "1 hour remaining";
      }
      return `${totalHours} hours remaining`;
    }
    return `${trialDaysLeft} days remaining`;
  };

  if (verifyingPayment) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 flex flex-col items-center justify-center text-center min-h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border border-amber-accent/20 flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-amber-accent animate-spin" />
          </div>
          <div className="absolute inset-0 w-20 h-20 rounded-full border-t border-amber-accent animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl italic text-white font-light">Verifying Your Payment</h2>
          <p className="text-gray-400 text-sm font-light max-w-md mx-auto leading-relaxed">
            Please hold on while we securely confirm your billing reference with the Paystack live gateway. Do not close or refresh this page.
          </p>
        </div>
      </div>
    );
  }

  if (verificationSuccess) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 flex flex-col items-center justify-center text-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl italic text-white font-light">Subscription Activated!</h2>
          <p className="text-emerald-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
            {verificationSuccess}
          </p>
          <p className="text-gray-400 text-xs font-light max-w-sm mx-auto">
            Your Premium advantages are now fully active on your account. Welcome to Gourmet Kitchen Plus.
          </p>
        </div>
        <button
          onClick={() => setVerificationSuccess(null)}
          className="px-8 py-3.5 bg-amber-accent text-black rounded-full font-black uppercase text-[10px] tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer shadow-lg active:scale-95"
        >
          Explore Gourmet Kitchen Plus
        </button>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 flex flex-col items-center justify-center text-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-3xl italic text-white font-light">Verification Failed</h2>
          <p className="text-rose-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
            {verificationError}
          </p>
          <p className="text-gray-400 text-xs font-light max-w-sm mx-auto">
            We couldn't verify your transaction. If money was deducted, please contact support with your payment reference.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setVerificationError(null)}
            className="px-8 py-3.5 bg-amber-accent text-black rounded-full font-black uppercase text-[10px] tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer shadow-lg active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-8 px-4 selection:bg-amber-accent/20">
      
      {/* Sparkly culinary banner header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-accent/10 border border-amber-accent/30 text-amber-accent font-mono text-[9px] uppercase tracking-widest font-black">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-accent" />
          Gourmet Kitchen Subscription
        </div>
        <h1 className="font-serif text-5xl xs:text-6xl font-light text-white leading-tight">
          Daily Meal Recipe <span className="italic text-amber-accent">Plus.</span>
        </h1>
        <p className="text-gray-400 font-light max-w-lg mx-auto italic text-base">
          Unlock unlimited generation, pro offline maps, real-time shared shopping guides, and high-fidelity plan builders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        
        {/* Left Side: Plus Benefits & Interactive Features list */}
        <div className="space-y-8">
          <div className="space-y-2">
            <h3 className="font-serif text-2xl text-white italic flex items-center gap-2">
              <Award className="text-amber-accent w-6 h-6 shrink-0" />
              Upgrade Advantages
            </h3>
            <p className="text-white/40 text-xs font-light">Elevate to an exquisite dining orchestration experience.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 font-sans">
            {[
              { title: "Unlimited Meal Generation", desc: "Generate recipes dynamically using premium Gemini API engines without throttling." },
              { title: "Shared Family Lists", desc: "Sync todos and ingredients cross-device in real-time with zero friction." },
              { title: "Smart Local Pantry Offline", desc: "No connection? No problem. Full caches keep your recipe archives instantly accessible." },
              { title: "Priority AI Scanning & Planner", desc: "Instantly scan pantries via device camera, and plan weekly calendars on a personalized schedule." }
            ].map((feature, i) => (
              <motion.div 
                whileHover={{ x: 4 }}
                key={i} 
                className="p-5 rounded-2xl bg-white/[0.02]/ border border-white/5 flex gap-4 hover:border-white/10 transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-amber-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-amber-accent" />
                </div>
                <div>
                  <h4 className="text-white text-xs font-black uppercase tracking-widest mb-1">{feature.title}</h4>
                  <p className="text-gray-400 text-xs font-light leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Left Side: Plus Benefits & Interactive Features list finished */}
        </div>


        {/* Right Side: Primary interactive Checkout and Plan Panel */}
        <div className="space-y-8">
          <div className="bg-[#121212]/30 p-8 sm:p-10 rounded-[44px] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 pointer-events-none select-none">
              <Zap className="w-12 h-12 text-amber-accent opacity-10" />
            </div>
            
            <div className="space-y-6 relative z-10 font-sans">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-accent mb-2.5 block">Plus Tier Tiering</span>
                <h2 className="font-serif text-4xl text-white italic">Plus Plan</h2>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-light text-white font-serif">$5</span>
                  <span className="text-white/40 text-sm italic">/ per month</span>
                </div>
                <p className="text-amber-accent text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber animate-pulse" />
                  Includes a 14-Day Free Evaluation Period
                </p>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <InlineErrorHelper message={error} className="text-xs bg-rose-500/5 p-4 rounded-2xl border border-rose-500/15 italic text-rose-400" />

                {trialSuccessMsg && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex gap-3 items-center text-left"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-emerald-300 font-medium leading-relaxed">{trialSuccessMsg}</p>
                  </motion.div>
                )}

                {isSubscribed ? (
                  <div className="p-6 bg-white/[0.01] rounded-2xl border border-white/10 text-center space-y-2.5">
                    <p className="text-amber-accent text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 shrink-0 fill-amber-accent" />
                      Daily Plus subscription active
                    </p>
                    <p className="text-white/50 text-xs font-light italic">Your billing credential verified via safe checkout.</p>
                    <p className="text-white/30 text-[9px] uppercase tracking-[0.2em] font-medium pt-1">Gourmet privileges fully unlocked</p>
                  </div>
                ) : isTrial ? (
                  <div className="p-6 bg-white/[0.01] rounded-2xl border border-white/10 text-center space-y-4">
                    <div className="space-y-1">
                      <p className="text-amber-accent text-[10px] font-black uppercase tracking-[0.2em]">Trial Active</p>
                      <p className="text-white text-xl font-serif italic">{getTrialCountdownText()}</p>
                    </div>
                    <p className="text-white/40 text-[11px] leading-relaxed italic">Enjoy full premium benefits. Complete full subscription below anytime to maintain priority services.</p>
                    
                    <div className="pt-4 border-t border-white/5">
                      <button 
                        onClick={handlePaystackSubscribe}
                        disabled={processing}
                        className="w-full py-3.5 bg-white text-black rounded-full font-black uppercase tracking-widest text-[9px] hover:bg-amber-accent transition-all duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-black/30"
                      >
                        {processing ? "Launching Secure Gateway..." : "Pay & Subscribe with Card ($5/mo)"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <button 
                      onClick={handleStartTrial}
                      disabled={processing}
                      className="w-full py-4.5 bg-amber-accent text-black rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all duration-300 shadow-xl shadow-amber-500/5 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                    >
                      {processing ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4.5 h-4.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Engaging Trial...
                        </span>
                      ) : (
                        <>
                          Start 14-Day Free Evaluation
                          <Sparkles className="w-4 h-4 shrink-0" />
                        </>
                      )}
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-white/5"></div>
                      <span className="flex-shrink mx-4 text-white/20 text-[9px] uppercase tracking-[0.3em] font-black">OR</span>
                      <div className="flex-grow border-t border-white/5"></div>
                    </div>

                    <button 
                      onClick={handlePaystackSubscribe}
                      disabled={processing}
                      className="w-full py-4 bg-transparent border border-white/20 text-white hover:border-white rounded-full font-black uppercase tracking-[0.18em] text-[9px] hover:bg-white/[0.02] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      Instant Purchase with Card ($5/mo)
                    </button>

                    <p className="text-[10px] text-white/40 text-center leading-normal pt-2 select-none">
                      Secured billing handled via legal compliance filters. Adjust preferences anytime in user accounts. See full policy logs inside the footer drawer.
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-6 text-white/20 pt-4 border-t border-white/5">
                  <CreditCard className="w-4 h-4" />
                  <Clock className="w-4 h-4" />
                  <Shield className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* BILLING HISTORY SECTION: Professional gourmet listing */}
      <div className="pt-12 border-t border-white/10 space-y-6">
        <div className="space-y-1 font-sans">
          <h3 className="text-white text-lg font-black uppercase tracking-widest flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-accent" />
            Billing Statements & Statements
          </h3>
          <p className="text-xs text-white/30 font-light">Review historical payment receipts. All figures listed in USD currency denomination.</p>
        </div>

        {(!profile?.billingHistory || profile.billingHistory.length === 0) ? (
          <div className="p-12 rounded-[32px] border border-white/5 text-center bg-white/[0.005] font-sans">
            <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-xs text-white/30 italic">No historical transactions logged.</p>
            <p className="text-[10px] text-white/20 mt-1">Completing active billing transactions aggregates statements instantly.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c]/80 font-sans">
            <div className="overflow-x-auto min-w-full">
              <table className="min-w-full text-left text-xs text-gray-400">
                <thead className="bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-white border-b border-white/10 select-none">
                  <tr>
                    <th scope="col" className="px-6 py-4">Reference</th>
                    <th scope="col" className="px-6 py-4">Transaction Date</th>
                    <th scope="col" className="px-6 py-4">Plan Description</th>
                    <th scope="col" className="px-6 py-4">Total Price</th>
                    <th scope="col" className="px-6 py-4">Auth Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {profile.billingHistory.map((item: BillingReceipt) => (
                    <tr key={item.id} className="hover:bg-white/[0.015] transition-colors leading-normal">
                      <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold tracking-wide text-white shrink-0">
                        {item.reference || item.id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-400">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-white font-medium">
                        {item.plan}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-amber-accent">
                        ${Number(item.amount).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {item.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Declined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-2.5 h-2.5" />
                            Cleared
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(item)}
                          className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-amber-accent hover:text-black hover:font-bold text-white transition-all duration-200 uppercase text-[9px] tracking-wider font-semibold"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>


      {/* INTERACTIVE POPUP RECEIPT DETAIL: Customized fine dining theme */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-sm bg-[#faf8f5] text-[#2c2825] border-2 border-[#e6e2db] rounded-[24px] overflow-hidden shadow-2xl p-6 font-mono select-none"
              style={{
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)"
              }}
            >
              
              {/* Receipt custom jagged header line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-[radial-gradient(circle,transparent_20%,#e6e2db_20%,#e6e2db_80%,transparent_80%)] bg-[length:12px_12px]" />

              {/* Close icon */}
              <button
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 text-[#8f8b83] hover:text-[#2c2825] p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center pt-4 pb-3 space-y-1">
                <h3 className="font-extrabold uppercase text-sm tracking-widest text-[#1c1917]">DAILY MEAL CO.</h3>
                <p className="text-[10px] text-[#8f8b83] font-medium uppercase tracking-wider">Your Digital Kitchen Atelier</p>
                <p className="text-[9px] text-[#8f8b83] leading-relaxed italic">147 Gourmet Ave, Cloud Cluster Suite 3000</p>
                <div className="border-b border-dashed border-[#d1cbc4] w-full pt-4" />
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between items-baseline font-semibold">
                  <span className="text-[#8f8b83] uppercase text-[10px]">Date:</span>
                  <span>{new Date(selectedReceipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline font-semibold">
                  <span className="text-[#8f8b83] uppercase text-[10px]">Invoice Ref:</span>
                  <span className="text-[11px] font-bold select-all">{selectedReceipt.reference}</span>
                </div>
                <div className="flex justify-between items-baseline font-semibold">
                  <span className="text-[#8f8b83] uppercase text-[10px]">Customer:</span>
                  <span>{user?.email}</span>
                </div>
                <div className="flex justify-between items-baseline font-semibold">
                  <span className="text-[#8f8b83] uppercase text-[10px]">Payment Type:</span>
                  <span>Authorized Token</span>
                </div>
                <div className="border-b border-dashed border-[#d1cbc4] w-full pt-2" />
              </div>

              <div className="py-4 space-y-3">
                <span className="text-[9px] uppercase font-bold text-[#8f8b83] tracking-widest block">ORDER DETAILS</span>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-bold">{selectedReceipt.plan}</span>
                  <span className="font-bold">${Number(selectedReceipt.amount).toFixed(2)}</span>
                </div>
                
                <div className="border-b border-dashed border-[#d1cbc4] w-full pt-1" />
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#8f8b83]">
                    <span>Subtotal:</span>
                    <span>${(selectedReceipt.amount * 0.95).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#8f8b83]">
                    <span>VAT / Taxes (5%):</span>
                    <span>${(selectedReceipt.amount * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-[#1c1917] pt-1">
                    <span>Total USD:</span>
                    <span>${Number(selectedReceipt.amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="border-b border-dashed border-[#d1cbc4] w-full" />

              {/* Dynamic stamp visual based on checked status */}
              <div className="relative pt-6 pb-2 text-center flex flex-col items-center justify-center space-y-4">
                
                {selectedReceipt.status === 'failed' ? (
                  <div className="border-2 border-dashed border-rose-600/30 text-rose-700 rounded-lg py-1 px-4 text-[10px] font-black uppercase tracking-widest rotate-[-6deg] self-center select-none shadow-sm shadow-rose-600/5 bg-[#faf8f5]/80">
                    Transaction Declined • Unpaid
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-emerald-600/30 text-emerald-700 rounded-lg py-1 px-4 text-[10px] font-black uppercase tracking-widest rotate-[-6deg] self-center select-none shadow-sm shadow-emerald-600/5 bg-[#faf8f5]/80">
                    Transaction Verified • Paid
                  </div>
                )}

                <p className="text-[9px] text-[#8f8b83] italic text-center max-w-[200px] leading-relaxed">
                  Every subscription keeps your culinary records safe. Thank you for making our workspace possible!
                </p>

                <div className="flex w-full gap-2 font-sans font-bold text-[9px] tracking-wider uppercase pt-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#2c2825] hover:bg-[#1c1917] text-[#faf8f5] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Invoice
                  </button>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="flex-1 py-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-stone-600 transition-colors cursor-pointer"
                  >
                    Close Sheet
                  </button>
                </div>
              </div>

              {/* Receipts custom jagged bottom line decor */}
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[radial-gradient(circle,transparent_20%,#e6e2db_20%,#e6e2db_80%,transparent_80%)] bg-[length:12px_12px] rotate-180" />

            </motion.div>

          </div>
        )}
      </AnimatePresence>


      {/* Policy and support footer info lists */}
      <div className="pt-12 border-t border-white/5 text-center space-y-4 font-sans leading-relaxed select-none">
        <p className="text-white/20 text-xs italic">
          Everything in Daily Meal Recipe workspace is tied to your account profile ID: <span className="text-white/40 font-mono font-medium">{user?.email}</span>
        </p>
        <div className="text-[10px] text-white/20 flex flex-wrap justify-center gap-x-4 gap-y-1.5 uppercase tracking-widest font-black">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-amber-accent transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-amber-accent transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-amber-accent transition-colors">Refund Policy</a>
        </div>
        <p className="text-white/15 text-[9px] uppercase tracking-[0.25em] font-medium">
          Secured workspace payments • Cancel anytime • Premium kitchen helpdesk: <a href="mailto:info@dailymealrecipe.online" className="text-amber-accent/80 hover:text-amber-accent transition-colors underline decoration-dotted font-bold">info@dailymealrecipe.online</a>
        </p>
      </div>

      {/* MODAL GOURMET PAYMENT CENTER OVERLAY */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!processing) setShowPaymentModal(false); }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Main Content Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: "spring", duration: 0.45 }}
              style={{
                backgroundColor: isModalLight ? '#fafafa' : '#0d0d0d',
                borderColor: isModalLight ? '#e5e5e5' : 'rgba(255,255,255,0.1)'
              }}
              className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto border rounded-[32px] shadow-2xl z-10 font-sans text-left ${
                isModalLight ? 'gourmet-modal-light' : 'gourmet-modal-dark'
              }`}
            >
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div 
                  style={{ borderColor: isModalLight ? '#e5e5e5' : 'rgba(255,255,255,0.05)' }}
                  className="flex justify-between items-center pb-4 border-b"
                >
                  <div className="space-y-1">
                    <span 
                      style={{ color: isModalLight ? '#b45309' : '#f59e0b' }}
                      className="text-[10px] font-bold tracking-[0.25em] uppercase block"
                    >
                      {paymentModalType === 'subscribe' ? 'Upgrade Checkout' : 'Secure Authorization'}
                    </span>
                    <h3 
                      style={{ color: modalHeadingColor }}
                      className="text-lg font-black uppercase tracking-wider !text-inherit"
                    >
                      {paymentModalType === 'subscribe' ? 'Meal Recipe Plus Plan ($5/mo)' : 'Link Safe Asset Reference'}
                    </h3>
                  </div>
                  
                  {/* Controls & Close */}
                  <div className="flex items-center gap-3">
                    {/* Interactive Light/Dark Toggle within Modal */}
                    <button
                      type="button"
                      onClick={() => setModalTheme(isModalLight ? 'dark' : 'light')}
                      style={{
                        backgroundColor: isModalLight ? '#171717' : '#ffffff',
                        color: isModalLight ? '#ffffff' : '#171717',
                        borderColor: isModalLight ? '#171717' : '#ffffff'
                      }}
                      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap active:scale-95 text-xs"
                    >
                      {isModalLight ? '☾ Dark' : '☼ Light'}
                    </button>
                    
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      disabled={processing}
                      style={{ color: isModalLight ? '#8c8c8c' : 'rgba(255,255,255,0.4)' }}
                      className="p-1.5 rounded-full hover:bg-neutral-800/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5 animate-none" />
                    </button>
                  </div>
                </div>

                {paymentFormSuccess ? (
                  /* GOURMET SUCCESS OUTCOME SCREEN */
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 
                        style={{ color: modalHeadingColor }}
                        className="font-serif text-2xl italic font-light"
                      >
                        Payment Authorized Successfully!
                      </h4>
                      <p 
                        style={{ color: isModalLight ? '#525252' : 'rgba(255,255,255,0.6)' }}
                        className="text-xs max-w-sm mx-auto leading-relaxed px-4"
                      >
                        {paymentFormSuccess}
                      </p>
                    </div>
                    
                    <div 
                      style={{ 
                        borderColor: isModalLight ? '#e5e5e5' : 'rgba(255,255,255,0.05)',
                        backgroundColor: isModalLight ? '#f8fafc' : 'rgba(255,255,255,0.02)'
                      }}
                      className="p-4 rounded-2xl border text-[10px] text-left font-mono space-y-1.5 max-w-sm mx-auto"
                    >
                      <div className="flex justify-between">
                        <span className="opacity-40 uppercase">GATEWAY</span>
                        <span className="text-amber-500 font-bold">PAYSTACK LIVE</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40 uppercase">AMOUNT</span>
                        <span className="text-white font-bold">{paymentModalType === 'subscribe' ? '$5.00 USD' : '$1.00 USD'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-40 uppercase">STATUS</span>
                        <span className="text-emerald-400 font-bold uppercase">VERIFIED WEBHOOK</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowPaymentModal(false);
                        setPaymentFormSuccess(null);
                      }}
                      className="px-6 py-3 bg-amber-500 text-black rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                      Continue to Gourmet Kitchen
                    </button>
                  </div>
                ) : paymentFormError ? (
                  /* GOURMET FAILURE OUTCOME SCREEN WITH DETAILED DECREASE & RETRY BUTTON */
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 animate-pulse">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 
                        style={{ color: modalHeadingColor }}
                        className="font-serif text-2xl italic font-light"
                      >
                        Transaction Declined
                      </h4>
                      <p 
                        style={{ color: isModalLight ? '#525252' : 'rgba(255,255,255,0.6)' }}
                        className="text-xs max-w-sm mx-auto leading-relaxed px-4"
                      >
                        We were unable to process your payment reference through Paystack.
                      </p>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-2xl border text-left text-xs max-w-sm mx-auto leading-relaxed ${
                        isModalLight 
                          ? 'bg-rose-50 border-rose-200 text-rose-800' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      <span className="font-bold block text-[10px] uppercase tracking-wider opacity-60 mb-1">Reason for Failure:</span>
                      <span className="italic">"{paymentFormError}"</span>
                    </div>

                    <div className="flex gap-3 justify-center max-w-sm mx-auto pt-2">
                      <button
                        onClick={() => {
                          setPaymentFormError(null);
                        }}
                        className="flex-grow py-3.5 bg-amber-500 text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer shadow-lg active:scale-95"
                      >
                        🔄 Return & Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SECURE LIVE CHECKOUT MODAL CARD */
                  <>
                    <div className="space-y-5">
                      {/* Secure Info Banner */}
                      <div 
                        style={{ 
                          borderColor: isSecretKeyConfigured ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          backgroundColor: isSecretKeyConfigured ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.04)'
                        }}
                        className="p-4 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed font-sans"
                      >
                        <Shield className={`w-5 h-5 shrink-0 mt-0.5 ${isSecretKeyConfigured ? 'text-emerald-500' : 'text-amber-500'}`} />
                        <div className="flex-1 space-y-1 text-left">
                          <span className="font-bold uppercase tracking-wider block text-[11px]" style={{ color: isSecretKeyConfigured ? '#10b981' : '#f59e0b' }}>
                            {isSecretKeyConfigured ? '🌟 Secure Paystack Gateway Active' : '⚠️ Live Keys Missing in AI Studio Preview'}
                          </span>
                          <span style={{ color: isModalLight ? '#334155' : '#cbd5e1' }} className="text-[11px] block animate-pulse">
                            {isSecretKeyConfigured 
                              ? "Your official secure payment channel is active. Clicking below will open Paystack's secure payment dialog to finalize your upgrade."
                              : "To test live payments in this preview environment, define your PAYSTACK_SECRET_KEY and VITE_PAYSTACK_PUBLIC_KEY in the AI Studio Settings menu. Clicking below will attempt the connection anyway."}
                          </span>
                        </div>
                      </div>

                      {/* Subscription Summary */}
                      <div 
                        style={{ 
                          borderColor: isModalLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                          backgroundColor: isModalLight ? '#ffffff' : 'rgba(255,255,255,0.02)'
                        }}
                        className="rounded-2xl border p-5 space-y-4 font-sans shadow-sm text-left"
                      >
                        <div className="flex justify-between items-center pb-3 border-b border-dashed" style={{ borderColor: isModalLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)' }}>
                          <span style={{ color: isModalLight ? '#475569' : '#9ca3af' }} className="text-xs font-bold uppercase tracking-wider">
                            Plan Type
                          </span>
                          <span style={{ color: '#f59e0b' }} className="text-sm font-black uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                            {paymentModalType === 'subscribe' ? 'Gourmet Plus Plan' : 'Card Authorization'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                          <span style={{ color: isModalLight ? '#475569' : '#9ca3af' }} className="text-xs font-semibold">
                            Account Profile
                          </span>
                          <span style={{ color: isModalLight ? '#0f172a' : '#ffffff' }} className="text-xs font-mono font-bold">
                            {user?.email}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-1">
                          <span style={{ color: isModalLight ? '#475569' : '#9ca3af' }} className="text-xs font-semibold">
                            Total Due Now
                          </span>
                          <span style={{ color: isModalLight ? '#0f172a' : '#ffffff' }} className="text-sm font-black text-amber-accent">
                            {paymentModalType === 'subscribe' ? '$5.00 USD / mo' : '$1.00 USD'}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-dashed" style={{ borderColor: isModalLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)' }}>
                          <p style={{ color: isModalLight ? '#64748b' : '#9ca3af' }} className="text-[10.5px] leading-relaxed">
                            {paymentModalType === 'subscribe' 
                              ? 'Daily Plus Plan includes unlimited AI-powered gourmet recipe generation, full smart kitchen personalization filters, and unlimited custom saved favorites. Billed automatically at $5.00 USD every month. Cancel anytime.' 
                              : 'An authorization invoice charge to safely link and verify your active card credentials. This payment is processed securely via Paystack.'}
                          </p>
                        </div>
                      </div>

                      {/* Primary Checkout Button */}
                      <div className="space-y-3">
                        <button
                          type="button"
                          disabled={processing}
                          onClick={handleRealPaystackPayment}
                          style={{
                            backgroundColor: '#10b981',
                            color: '#ffffff'
                          }}
                          className="w-full py-4 hover:opacity-90 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/15 hover:scale-[1.01] active:scale-[0.99]"
                        >
                          {processing ? (
                            <span className="flex items-center gap-2 font-black text-[10px] tracking-widest uppercase text-white">
                              <RefreshCw className="w-4 h-4 animate-spin text-white" />
                              Contacting Secure Gateway...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 font-black text-[10px] tracking-widest uppercase text-white">
                              <ExternalLink className="w-4 h-4 shrink-0 text-white" />
                              {paymentModalType === 'subscribe' ? 'Pay $5.00 Securely with Paystack' : 'Authorize $1.00 with Paystack'}
                            </span>
                          )}
                        </button>

                        {/* Back / Dismiss Modal Button */}
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(false)}
                          disabled={processing}
                          style={{
                            borderColor: isModalLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)',
                            color: isModalLight ? '#1f2937' : '#f3f4f6'
                          }}
                          className="w-full py-3.5 hover:bg-neutral-500/5 rounded-2xl font-black uppercase tracking-widest text-[9.5px] transition-all flex items-center justify-center gap-1.5 cursor-pointer border disabled:opacity-50"
                        >
                          ← Cancel & Back to Plans
                        </button>
                      </div>

                      {/* Billing descriptor notice & terms */}
                      <div className="space-y-3 pt-1">
                        <p 
                          style={{ color: isModalLight ? '#0369a1' : '#7dd3fc' }}
                          className="text-[10px] leading-relaxed font-semibold text-center"
                        >
                          📌 <strong>Billing Descriptor:</strong> Charges will appear on your card ledger as <strong>DAILYMEALRECIPE</strong> for simple, transparent accounting.
                        </p>

                        <div 
                          style={{ borderColor: isModalLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)' }}
                          className="pt-2.5 border-t text-[10px] flex flex-wrap justify-center gap-x-2 text-center"
                        >
                          <span style={{ color: isModalLight ? '#64748b' : '#6b7280' }}>By continuing, you agree to our</span>
                          <a 
                            href="/terms" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: isModalLight ? '#0284c7' : '#38bdf8' }}
                            className="font-bold underline hover:opacity-85"
                          >
                            Terms of Service
                          </a>
                          <span style={{ color: isModalLight ? '#64748b' : '#6b7280' }}>&</span>
                          <a 
                            href="/privacy" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: isModalLight ? '#0284c7' : '#38bdf8' }}
                            className="font-bold underline hover:opacity-85"
                          >
                            Privacy Policy
                          </a>
                        </div>
                      </div>

                      <p 
                        style={{ color: isModalLight ? '#737373' : '#717171' }}
                        className="text-[9px] text-center font-mono leading-normal select-none"
                      >
                        Fully compliant encrypted gateway pipeline. Verified using local state algorithms.
                      </p>
                    </div>
                  </>
                )}
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>

    </div>
  );
}
