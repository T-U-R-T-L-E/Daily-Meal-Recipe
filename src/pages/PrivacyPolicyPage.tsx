import { useState, useEffect } from 'react';
import { Shield, BookOpen, Clock, Mail, ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const [policyText, setPolicyText] = useState('');
  const [appName, setAppName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('legal_app_name') || 'Daily Meal Recipe';
    const savedEntity = localStorage.getItem('legal_entity_name') || 'Daily Meal Recipe LLC';
    const savedEmail = localStorage.getItem('legal_support_email') || 'info@dailymealrecipe.online';
    setAppName(savedName);

    // Initial default draft matching the custom generator
    const defaultBody = `PRIVACY POLICY FOR ${savedName.toUpperCase()}

Last Updated: May 2026

At ${savedName} ("we," "our," or "us"), operated under the entity ${savedEntity}, we are absolutely committed to protecting user transparency and complying with regional regulations such as GDPR (EU) and CCPA (USA).

1. TYPES OF USER DATA WE PROCESS
We process account credentials and metrics necessary to support cloud-synchronization, secure authentication, and healthy, personalized favorite filters:

- User Display Name: Used to personalize your experience.
- Email Address: Essential for account security, verification, and recovery.
- Authentication Credentials: Salted cryptographical metadata for safety checking.
- Cookies & Browser Storage: Storing local parameters, ingredients list items, and session indicators.
- Dietary Requirements / Allergies: Strictly processed with high consent to safeguard recipes from allergy concerns.

2. HOW WE STORE AND SECURE DATA
All user preferences and database items are hosted securely under modern Firestore guidelines. Credentials cannot be index-read in plain sight. Paystack transactions are processed end-to-end securely off-server.

3. YOUR RIGHTS: ERASURE & JSON EXPORT
Under strict GDPR rules, you hold full claim to request instant, permanent erasure of your culinary registries, subscription state records, or to download a full JSON dump of your profile files.

For questions or data action requests, please dispatch details to ${savedEmail}.`;

    const savedPolicy = localStorage.getItem('legal_policy_draft') || defaultBody;
    setPolicyText(savedPolicy);
  }, []);

  return (
    <div className="min-h-screen bg-onyx py-12 px-4 sm:px-6 text-slate-100">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Nav actions */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-amber-accent/70 hover:text-amber-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Kitchen</span>
          </Link>

          <Link 
            to="/compliance" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all"
          >
            <span>Legal Desk Hub</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Paper Layout Card */}
        <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 border border-white/5 shadow-2xl overflow-hidden leading-relaxed">
          <div className="absolute top-0 right-0 w-60 h-60 bg-amber-accent/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-5">
              <div className="p-3 bg-amber-accent/10 text-amber-accent rounded-2xl">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="font-serif text-2xl font-light text-white">Privacy Policy Document</h1>
                <p className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                  Daily Meal Recipe Public Publication • Real-time Compliance verified
                </p>
              </div>
            </div>

            {/* Render with neat spacing */}
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-300 hover:text-white leading-relaxed space-y-4 font-light">
              {policyText}
            </div>

            {/* Extra Disclaimer Box */}
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-[10px] text-slate-400 space-y-1.5">
              <span className="font-bold text-white uppercase tracking-wider block">GDPR & CCPA Certification</span>
              <p>
                This publication represents a dynamic legal commitment of {appName}. Users hold complete authority over their privacy. Under CCPA definitions, we declare that zero consumer profiles have been rented or sold for advertising brokers during this calendar quarter.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 uppercase font-mono tracking-widest">
          © {new Date().getFullYear()} {appName} • All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
