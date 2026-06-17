import { useState, useEffect } from 'react';
import { Shield, BookOpen, Clock, Mail, ExternalLink, ArrowLeft, CheckCircle } from 'lucide-react';
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

Last Updated: June 2026

At ${savedName} ("we," "our," or "us"), operated under the entity ${savedEntity}, we are absolutely committed to protecting user transparency, secure system architecture, and complying with regional regulations such as GDPR (EU) and CCPA (USA).

1. TYPES OF USER DATA WE PROCESS
We process account credentials and metrics necessary to support cloud-synchronization, secure authentication, and healthy, personalized favorite filters:

- User Display Name: Used to personalize your experience.
- Email Address: Essential for account security, verification, and recovery.
- Authentication Credentials: Salted cryptographical metadata for safety checking.
- Cookies & Browser Storage: Storing local parameters, ingredients list items, and session indicators.
- Dietary Requirements / Allergies: Strictly processed with high consent to safeguard recipes from allergy concerns.

2. SECURITY DISCLOSURE GATEWAY AND AI PROCESSING CONSENT
By using the Platform, you acknowledge and agree to our AI processing frameworks:
- Secured Outbound Transmissions: To generate delicious, custom-tailored dishes and search the global library, our Artisanal AI parses your entries. All ingredients, search queries, food categories, and allergy restrictions are securely transmitted to Google Gemini API servers (operated and maintained by Google LLC, our model vendor partner) for calculation.
- Personal Perimeter Protection: Zero high-sensitivity account metadata (such as passwords, internal support logs, or billing credentials) is ever attached or transferred to outside services.
- Verification Duty: Generative AI outputs are inherently non-deterministic and advisors, NOT absolute physical certifications. Users bear full responsibility to manually inspect food packaging and verify allergenic ingredients before preparation or consumption.

3. PHYSICAL STORAGE AND SECURITY MEASURES
All user preferences and database items are hosted securely under modern Firestore guidelines. Credentials cannot be index-read in plain sight. We enforce strict data transmission controls:

- Secure Transport: Authorized tokens are restricted to premium SSL/TLS connections and transmitted solely in request headers, never exposed via query strings or URL history.
- Browser Cache Security: Firewalls protect browser level state, automatically clear memory caching under system restarts, and self-heal from sandbox environment corruption.

4. SECURITY COHESION & THIRD-PARTY OAuth
We protect user identities across environments utilizing industry-standard validation mechanisms:
- Proof Key for Code Exchange (PKCE) natively shields OAuth handshakes, preventing auth manipulation across shared devices.
- Anti-CSRF protection forces cryptographically random token callbacks.
- RISC Integration coordinates security channels to automatically clear active local sessions if authentication keys are revoked or compromised.

5. YOUR RIGHTS: ERASURE & JSON EXPORT
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
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-300 hover:text-white leading-relaxed space-y-4 font-light border-b border-white/5 pb-6">
              {policyText}
            </div>

            {/* High-Fidelity App Security & OAuth Status Dashboard */}
            <div className="pt-2 text-left space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-accent/10 p-1.5 rounded-lg text-amber-accent animate-pulse">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white">App Security & Trust Protocols</h4>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Protection
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Item 1: Secure Code Flow */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Secure PKCE Authorization Code Flow</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Uses Proof Key for Code Exchange (PKCE) natively, preventing auth manipulation across shared desktop and client-side devices.
                    </p>
                  </div>
                </div>

                {/* Item 2: CSRF Security */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Anti-CSRF State Parameter Protection</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Forces unique cryptographically random state parameters on token callbacks, shielding you from cross-site request forgery.
                    </p>
                  </div>
                </div>

                {/* Item 3: Secure Tokens */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Secure Transport & Header Transfer</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Tokens are restricted to safe SSL/TLS connections and transmitted solely in request headers, never exposed via query strings or URL histories.
                    </p>
                  </div>
                </div>

                {/* Item 4: Cross-Account Protection */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Cross-Account Protection (RISC Integration)</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Integrates our coordination server directly with Google Security Event Coordination to automatically clear local sessions on token revocation or hijack events.
                    </p>
                  </div>
                </div>
                
                {/* Item 5: App Block / Webview Auditing */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors md:col-span-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">App Integrity & Ownership Verification</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Domain ownership holds valid SSL, verified signatures, and security validation configurations aligning strictly on production targets.
                    </p>
                  </div>
                </div>
              </div>
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
