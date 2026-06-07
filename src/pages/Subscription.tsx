import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Check, CreditCard, Sparkles, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
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

  // Load Paystack script dynamically
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
    loadProfile();
  }, [user]);

  // Option 1: Start 3-Month Free Trial immediately
  const handleStartTrial = async () => {
    if (!user || !profile) return;
    setProcessing(true);
    setError(null);
    setTrialSuccessMsg(null);

    try {
      // Set trial end date to 90 days from now (3 months)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 90);

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

      setTrialSuccessMsg("Fantastic choice! Your 3-month free trial of Plus is now active!");
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

  // Option 2: Paystack Checkout Subscription ($5/month)
  const handlePaystackSubscribe = () => {
    if (!user || !profile) return;

    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackPublicKey) {
      const friendlyVal = handleError(
        "Payment gateway configuration missing. The public billing key is currently unassigned in our environment variables. Please check back shortly or let the system administrator know.",
        { componentName: 'Subscription', actionName: 'loadPaystack', preferredPlacement: 'inline' }
      );
      setError(friendlyVal);
      return;
    }

    if (!(window as any).PaystackPop) {
      const friendlyVal = handleError(
        "Our billing engine has not completed loading. The external payment library script was delayed. Please wait a few seconds and try clicking subscribe again.",
        { componentName: 'Subscription', actionName: 'loadPaystackPop', preferredPlacement: 'inline' }
      );
      setError(friendlyVal);
      return;
    }

    setProcessing(true);
    setError(null);
    setTrialSuccessMsg(null);

    const handler = (window as any).PaystackPop.setup({
      key: paystackPublicKey,
      email: user.email || 'customer@example.com',
      amount: 500, // $5.00 in minor units/cents
      currency: "USD",
      ref: 'pk-ref-' + Date.now(),
      callback: async (response: any) => {
        try {
          // Verify on backend
          const verifyResponse = await fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference: response.reference })
          });
          
          const result = await verifyResponse.json();
          if (result.status === 'success') {
            const updatedSubscription = {
              status: 'active',
              subscribedDate: new Date().toISOString(),
              trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            };

            await updateDoc(doc(db, 'users', user.uid), {
              subscription: updatedSubscription
            });

            setProfile({
              ...profile,
              subscription: updatedSubscription as any
            });

            setTrialSuccessMsg("Wonderful! Payment verified. Your Plus subscription is now active with 3 months free trial!");
          } else {
            const friendlyVal = handleError(
              result.error || "Payment validation check failed. The gateway rejected the secure signature.",
              { componentName: 'Subscription', actionName: 'verifyCallbackUnsuccessful', preferredPlacement: 'inline' }
            );
            setError(friendlyVal);
          }
        } catch (err: any) {
          const friendlyVal = handleError(err, {
            componentName: 'Subscription',
            actionName: 'verifyCallbackException',
            preferredPlacement: 'inline'
          });
          setError(friendlyVal);
        } finally {
          setProcessing(false);
        }
      },
      onClose: () => {
        setProcessing(false);
      }
    });

    handler.openIframe();
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
  const trialDaysLeft = profile?.subscription?.trialEndDate 
    ? Math.max(0, Math.ceil((new Date(profile.subscription.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-20 py-12">
      <div className="text-center space-y-6">
        <h1 className="font-serif text-6xl font-light text-white leading-none">
          Daily Meal Recipe <span className="italic text-amber-accent">Plus.</span>
        </h1>
        <p className="text-gray-500 font-light max-w-xl mx-auto italic text-lg">
          Elevate your cooking experience with pro features, smart tools, and unlimited recipe saves.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-10">
          <div className="space-y-4">
            <h3 className="font-serif text-3xl text-white italic">Premium Benefits</h3>
            <p className="text-white/40 text-sm italic">Unlock the full potential of your digital kitchen.</p>
          </div>

          <div className="space-y-6">
            {[
              { title: "Unlimited Generation", desc: "No daily limits on creating new recipes." },
              { title: "Smart Offline Access", desc: "Save unlimited recipes for offline cooking." },
              { title: "Advanced Meal Planning", desc: "Smart weekly schedules and grocery syncing." },
              { title: "Priority Features", desc: "Early access to new experimental tools." }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-amber-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Check className="w-3 h-3 text-amber-accent" />
                </div>
                <div>
                  <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1">{feature.title}</h4>
                  <p className="text-white/40 text-xs italic">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-graphite p-12 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <Zap className="w-12 h-12 text-amber-accent opacity-10" />
          </div>
          
          <div className="space-y-8 relative z-10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-accent mb-4 block">Current Plan</span>
              <h2 className="font-serif text-5xl text-white italic">Plus Plan</h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-light text-white">$5</span>
                <span className="text-white/40 text-sm italic">/ per month</span>
              </div>
              <p className="text-amber-accent text-xs font-bold uppercase tracking-widest">3 Months Free Trial Included</p>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-6">
              <InlineErrorHelper message={error} className="text-sm bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 italic text-rose-400" />

              {trialSuccessMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3 items-start">
                  <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-emerald-300 font-medium italic leading-relaxed">{trialSuccessMsg}</p>
                </div>
              )}

              {isSubscribed ? (
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-2">
                  <p className="text-amber-accent text-xs font-bold uppercase tracking-widest">Subscription Active</p>
                  <p className="text-white/50 text-[11px] italic">Verified via Secure Checkout</p>
                  <p className="text-white/30 text-[9px] uppercase tracking-wider">Thanks for choosing Daily Meal Plus!</p>
                </div>
              ) : isTrial ? (
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center space-y-3">
                  <p className="text-amber-accent text-xs font-bold uppercase tracking-widest">3-Month Free Trial Active</p>
                  <p className="text-white text-base font-serif italic">{trialDaysLeft} days remaining</p>
                  <p className="text-white/40 text-[10px] italic">Enjoy full access! After trial ends, subscription is $5/month.</p>
                  
                  <div className="pt-4 border-t border-white/5">
                    <button 
                      onClick={handlePaystackSubscribe}
                      disabled={processing}
                      className="w-full py-3 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-amber-accent transition-all duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {processing ? "Connecting secure gateway..." : "Pre-Link Card Securely"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={handleStartTrial}
                    disabled={processing}
                    className="w-full py-5 bg-amber-accent text-black rounded-full font-bold uppercase tracking-[0.2em] text-[11px] hover:bg-white transition-all duration-300 shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                  >
                    {processing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        Activating Trial...
                      </span>
                    ) : (
                      <>
                        Start 3-Month Free Trial
                        <Sparkles className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-white/20 text-[9px] uppercase tracking-widest font-bold">OR</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <button 
                    onClick={handlePaystackSubscribe}
                    disabled={processing}
                    className="w-full py-4 bg-transparent border border-white/20 text-white rounded-full font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Subscribe with Card ($5/mo)
                  </button>

                  {processing && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[9px] uppercase tracking-widest text-center text-amber-accent/80 font-bold animate-pulse pt-2"
                    >
                      🔒 Securing connection to secure payment gateway
                    </motion.p>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-center gap-6 text-white/20">
                <CreditCard className="w-4 h-4" />
                <Clock className="w-4 h-4" />
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 border-t border-white/5 text-center space-y-4">
        <p className="text-white/20 text-xs italic">
          Everything in Daily Meal Recipe is tied to your unique email address: <span className="text-white/40">{user?.email}</span>
        </p>
        <p className="text-white/15 text-[10px] uppercase tracking-[0.2em] font-medium leading-relaxed">
          Secure payment processing • Cancel anytime • Premium Support: <a href="mailto:info@dailymealrecipe.online" className="text-amber-accent/80 hover:text-amber-accent transition-colors underline decoration-dotted font-bold">info@dailymealrecipe.online</a>
        </p>
      </div>
    </div>
  );
}
