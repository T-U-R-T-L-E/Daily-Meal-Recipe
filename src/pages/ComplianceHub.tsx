import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Scale, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Download, 
  ExternalLink, 
  Globe, 
  Settings, 
  UserX, 
  HelpCircle, 
  Info, 
  Lock, 
  PlusCircle, 
  Copy, 
  Cookie, 
  RotateCw, 
  Eye, 
  Check, 
  Mail, 
  FileSpreadsheet, 
  ExternalLink as LinkIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Data types declared in the internal registry mapping
interface DataItem {
  key: string;
  name: string;
  category: 'essential' | 'analytics' | 'marketing' | 'sensitive';
  description: string;
  collected: boolean;
  purpose: string;
}

export default function ComplianceHub() {
  // 1. App Legal details
  const [appName, setAppName] = useState(() => localStorage.getItem('legal_app_name') || 'Daily Meal Recipe');
  const [legalEntity, setLegalEntity] = useState(() => localStorage.getItem('legal_entity_name') || 'Daily Meal Recipe LLC');
  const [supportEmail, setSupportEmail] = useState(() => localStorage.getItem('legal_support_email') || 'info@dailymealrecipe.online');
  const [termlyUrl, setTermlyUrl] = useState(() => localStorage.getItem('legal_termly_url') || '');
  const [nameChecked, setNameChecked] = useState(false);
  const [nameCheckResult, setNameCheckResult] = useState<{ status: 'idle' | 'checking' | 'valid'; message: string }>({ status: 'idle', message: '' });

  // 2. Interactive Onboarding Checklist
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem('legal_checklist');
    return saved ? JSON.parse(saved) : {
      privacyPolicyCreated: false,
      termsAdded: false,
      dataCollectionDeclared: false,
      consentFlowsConfigured: false,
      appNameChecked: false,
      legalPagesLinked: false,
      aiConsentConfigured: false,
    };
  });

  // Save checklist helper
  const toggleChecklist = (key: keyof typeof checklist) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    localStorage.setItem('legal_checklist', JSON.stringify(updated));
  };

  // 3. Data Collective Registry
  const [registry, setRegistry] = useState<DataItem[]>(() => {
    const saved = localStorage.getItem('legal_data_registry');
    if (saved) return JSON.parse(saved);
    return [
      { key: 'name', name: 'User Display Name', category: 'essential', description: 'Used to welcome cooks and personalize certificates.', collected: true, purpose: 'Profile Personalization' },
      { key: 'email', name: 'Email Address', category: 'essential', description: 'Essential for credentials, password recovery, and email verification.', collected: true, purpose: 'Security & Access Control' },
      { key: 'auth_details', name: 'Authentication Credentials', category: 'essential', description: 'Salted credentials and account token validation metadata.', collected: true, purpose: 'Account Integrity & Protection' },
      { key: 'phone', name: 'Phone Number', category: 'marketing', description: 'Optionally collected for recipe SMS dispatch and marketing updates.', collected: false, purpose: 'Direct Messaging' },
      { key: 'device_info', name: 'Device Information', category: 'analytics', description: 'Detects mobile vs browser viewport configurations for optimal scaling.', collected: true, purpose: 'UX Optimization' },
      { key: 'analytics', name: 'Usage Behavior & Analytics', category: 'analytics', description: 'Tracks recipe views, search logs, and meal plans for dynamic ranking.', collected: true, purpose: 'Algorithmic Relevance' },
      { key: 'crash_logs', name: 'Crash Reports/Diagnostics', category: 'analytics', description: 'Raw tracebacks generated upon javascript execution faults.', collected: true, purpose: 'Bug Patching & Reliability' },
      { key: 'cookies', name: 'Tracking Cookies', category: 'analytics', description: 'Locally cached session keys stored in browser headers & state.', collected: true, purpose: 'Continuous State Sync' },
      { key: 'ip_address', name: 'IP Address', category: 'analytics', description: 'Network identifier parsed for security telemetry and spam protection.', collected: true, purpose: 'Defense & Geo-localization' },
      { key: 'location', name: 'Location Data', category: 'sensitive', description: 'Used to offer regional grocery pricing and localized cuisines.', collected: false, purpose: 'Regional Adaptation' },
      { key: 'payment', name: 'Payment/Card Details', category: 'essential', description: 'Transmitted securely straight to card-vessel processor (Paystack).', collected: true, purpose: 'Billing Verification & Subscriptions' },
      { key: 'allergies', name: 'Dietary Conditions & Allergies', category: 'sensitive', description: 'Custom selection of allergies to filter meal suggestions safe for you.', collected: true, purpose: 'Allergy Safeguarding & Filters' }
    ];
  });

  // Save registry helper
  const toggleCollected = (index: number) => {
    const updated = [...registry];
    updated[index].collected = !updated[index].collected;
    setRegistry(updated);
    localStorage.setItem('legal_data_registry', JSON.stringify(updated));

    // Auto mark Data Collection declared
    if (!checklist.dataCollectionDeclared) {
      toggleChecklist('dataCollectionDeclared');
    }
  };

  // Save app settings text
  useEffect(() => {
    localStorage.setItem('legal_app_name', appName);
    localStorage.setItem('legal_entity_name', legalEntity);
    localStorage.setItem('legal_support_email', supportEmail);
    localStorage.setItem('legal_termly_url', termlyUrl);
  }, [appName, legalEntity, supportEmail, termlyUrl]);

  // Check unique app name trademark mock check
  const checkAppNameTrademark = () => {
    setNameChecked(true);
    setNameCheckResult({ status: 'checking', message: 'Querying global trademark databases and App Store name space...' });
    setTimeout(() => {
      // Simulate real namespace query
      const isTooCommon = ['meal app', 'recipes', 'cooking app', 'kitchen'].includes(appName.toLowerCase());
      if (isTooCommon) {
        setNameCheckResult({
          status: 'idle',
          message: `⚠️ "${appName}" is highly generic. Consider pairing with a distinctive suffix to avoid Trademark disputes and potential App Store index rejection.`
        });
      } else {
        setNameCheckResult({
          status: 'valid',
          message: `✅ Unique namespace verified. "${appName}" possesses proper distinction and is highly defensible for trademark protection.`
        });
        // Ticks checkbox automatically
        if (!checklist.appNameChecked) {
          toggleChecklist('appNameChecked');
        }
      }
    }, 1200);
  };

  // Warning conditions: collects data AND hasn't checked/created Privacy Policy
  const collectsData = registry.some(item => item.collected);
  const showPrivacyWarning = collectsData && !checklist.privacyPolicyCreated;

  // GDPR/CCPA simulator states
  const [gdprEmail, setGdprEmail] = useState('user@cookmaster.fake');
  const [gdprStatus, setGdprStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [gdprLogs, setGdprLogs] = useState<string[]>([]);
  
  const triggerGdprEraseSimulation = () => {
    setGdprStatus('running');
    setGdprLogs([]);
    const logs = [
      `[GDPR RIGHT TO ERASURE] Received request for identity: ${gdprEmail}...`,
      `[AUTH SECURE] Anonymizing Firebase authentication credentials to prevent physical linking...`,
      `[DATABASE CLEAN] Purging custom recipes, meal planners, and shopping items associated with UID...`,
      `[AUDIT COMPLIANT] Clearing cookies, IP logs, and local analytics behaviors...`,
      `[PAYMENT TERMINATE] Suspending Paystack recurrent triggers and deleting tokenizations...`,
      `[VERIFICATION SUCCESS] Purge completed. Dispatched legal erasure confirmation document to target. Zero identifiable traces retained.`
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setGdprLogs(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setGdprStatus('done');
        }
      }, (index + 1) * 750);
    });
  };

  const revokeAIConsent = () => {
    localStorage.removeItem('ai_consent_accepted');
    setHasAIConsented(false);
    alert('AI Data Processing consent has been revoked successfully. User pages will trigger the transparency pop-up on next run.');
  };

  // Cookie banner customizer states
  const [bannerPlacement, setBannerPlacement] = useState<'bottom' | 'floating' | 'top'>('floating');
  const [bannerTheme, setBannerTheme] = useState<'amber' | 'emerald' | 'crimson' | 'dark'>('amber');
  const [bannerText, setBannerText] = useState('We use state cookies and system analytics to organize your custom grocery lists, preheat recipe configurations, and protect payment channels.');
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const [isCookieConsentSaved, setIsCookieConsentSaved] = useState(false);

  // AI Consent Simulator states
  const [hasAIConsented, setHasAIConsented] = useState(() => localStorage.getItem('ai_consent_accepted') === 'true');

  // Dynamic policy content generation
  const [policyDraft, setPolicyDraft] = useState('');
  const [termsDraft, setTermsDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'policy' | 'terms'>('policy');

  const generateLegalDrafts = () => {
    const collectedList = registry.filter(r => r.collected);
    const essential = collectedList.filter(r => r.category === 'essential');
    const analytics = collectedList.filter(r => r.category === 'analytics');
    const marketing = collectedList.filter(r => r.category === 'marketing');
    const sensitive = collectedList.filter(r => r.category === 'sensitive');

    const privacyBody = `PRIVACY POLICY FOR ${appName.toUpperCase()}

Last Updated: June 2026

At ${appName} ("we," "our," or "us"), operated under the entity ${legalEntity}, we are absolutely committed to protecting user transparency and complying with regional regulations such as GDPR (EU) and CCPA (USA).

1. TYPES OF USER DATA WE PROCESS
Based on your declared application settings, we collect and process the following specific components:

A. Essential Operational Data (Strictly Required for App Operation):
${essential.map(e => `- ${e.name}: Used for "${e.purpose}" (${e.description})`).join('\n')}

B. Technical Behavior & Performance Analytics Data:
${analytics.map(a => `- ${a.name}: Used for "${a.purpose}" (${a.description})`).join('\n')}

C. Marketing & Outreach Communication Data:
${marketing.length ? marketing.map(m => `- ${m.name}: Used for "${m.purpose}" (${m.description})`).join('\n') : '- None currently authorized.'}

D. Sensitive Information (Requires High-Consent Controls):
${sensitive.length ? sensitive.map(s => `- ${s.name}: Used for "${s.purpose}" (${s.description})`).join('\n') : '- None currently authorized.'}

2. SECURITY DISCLOSURE GATEWAY AND AI PROCESSING CONSENT
By using the Platform, you acknowledge and agree to our AI processing frameworks:
- Secured Outbound Transmissions: To generate delicious, custom-tailored dishes and search the global library, our Artisanal AI parses your entries. All ingredients, search queries, food categories, and allergy restrictions are securely transmitted to Google Gemini API servers (operated and maintained by Google LLC, our model vendor partner) for calculation.
- Personal Perimeter Protection: Zero high-sensitivity account metadata (such as passwords, internal support logs, or billing credentials) is ever attached or transferred to outside services.
- Verification Duty: Generative AI outputs are inherently non-deterministic and advisors, NOT absolute physical certifications. Users bear full responsibility to manually inspect food packaging and verify allergenic ingredients before preparation or consumption.

3. HOW WE STORE AND SECURE DATA
All account structures, preferences, and culinary credentials are encrypted and stored in certified high-security database regions. No human credentials are physically indexable. Payment operations are routed through modern end-to-end encrypted gateways. We never retain physical card information on our servers.

4. THIRD-PARTY DATA DISCLOSURES
We do not sell, trade, or rent your database records to advertising brokers. Data is parsed only through essential developer cloud platforms to keep the application fast, performant, and reliable.

5. USER RIGHTS, EXPORT, AND GDPR ERASURE REQUESTS
You retain absolute control of your data:
- Right to Export: Retrieve a complete structural JSON of your favorites and pantry lists instantly at any time.
- Right to be Forgotten (Erasure): Submit a secure profile purge request inside the application or via email to request deletion of all associated credentials.

6. CONTACT LEGAL DESK
For queries, disputes, and compliance investigations, please contact us directly at:
Email: ${supportEmail}`;

    const termsBody = `TERMS OF SERVICE AGREEMENT

Last Updated: June 2026

Welcome to ${appName}! This Agreement governs your legal usage of the platform, tools, and algorithms provided by ${legalEntity}.

1. THE PLATFORM DECORUM & ACCEPTABLE USE
As a condition of your account creation, you agree strictly to refrain from:
- Utilizing automated web scraping or script scripts against our recipe datasets.
- Reverse engineering the generative layout or pantry structures.
- Uploading malicious files or binary proxies.
Violations of platform security will result in an immediate unconditional ban without notice or refund.

2. SECURITY DISCLOSURE GATEWAY AND AI PROCESSING CONSENT
By accepting this Agreement and continued usage of our Platform, you grant explicit double-opt-in consent to our AI operations:
- Data Transfer to Partners: You authorize the secure transmission of ingredient logs, meal query terms, and health/allerigen setup profiles to Google Gemini API servers (operated by Google LLC) to programmatically compute optimal culinary pairings.
- Manual verification Duty: You acknowledge that artificial-intelligence language models are subject to logical hallucinations. You maintain an absolute, personal duty to check phyiscal packaging labels, expiry times, and allergen instructions manually.
- Service Limitation: Generative output is strictly advisory. We accept no civil or healthcare liability under any circumstances.

3. FEES, SUBSCRIPTIONS & REFUND POLICY
Some features of ${appName} are categorized as Plus components. Subscription rates, trial limits, and renewal dates are disclosed before activation. Paid modules are contractually billed in advance.

Refunds & Guarantee: We offer a 14-day hassle-free refund policy for first-time premium subscription upgrades. You can receive a full refund of your payment if requested within 14 days of upgrade. After 14 days, fees are non-refundable. Refund requests must be sent to the support legal desk. Accounts found in violation of security or Decorum guidelines are entirely ineligible for refunds.

4. PHYSICAL ALLERGEN WARNING & LIMITATION OF LIABILITY
Our meal planners, visual food scanners, and AI chefs act solely as advisory cooking guides. We cannot and do not guarantee the completeness or safety of allergy filtering. It is your absolute responsibility to check raw ingredients and prepare items safely. ${legalEntity} accepts no liability for foodborne illnesses, physical discomforts, or injury resulting from using our kitchen tools.

5. DISPUTE RESOLUTION & ARBITRATION
This Agreement is governed under statutory laws. Any insolvencies or disputes will be resolved privately via professional mediation channels before seeking court litigation.

6. REGISTRATION ACCEPTANCE
By clicking "I agree to the Terms of Service and Privacy Policy" during registration, you bind your digital acceptance securely.

Support Contact: ${supportEmail}`;

    setPolicyDraft(privacyBody);
    setTermsDraft(termsBody);
    localStorage.setItem('legal_policy_draft', privacyBody);
    localStorage.setItem('legal_terms_draft', termsBody);

    // Auto mark Privacy Policy and Terms as Created in Checklist
    if (!checklist.privacyPolicyCreated) toggleChecklist('privacyPolicyCreated');
    if (!checklist.termsAdded) toggleChecklist('termsAdded');
    if (!checklist.legalPagesLinked) toggleChecklist('legalPagesLinked');
  };

  useEffect(() => {
    // Generate draft on first mount if blank to populate beautiful view
    generateLegalDrafts();
  }, [appName, legalEntity, supportEmail]);

  // Copy draft to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied legal text draft to clipboard!');
  };

  // Export internal registry as JSON compliant payload
  const handleExportJSON = () => {
    const payload = {
      appName,
      legalEntity,
      supportEmail,
      termlyUrl,
      registryDeclaration: registry.filter(r => r.collected).map(r => ({
        dataKey: r.key,
        name: r.name,
        category: r.category,
        purpose: r.purpose
      })),
      onboardingComplete: Object.values(checklist).every(v => v),
      cookieConsentPreferences: {
        placement: bannerPlacement,
        theme: bannerTheme,
        text: bannerText,
        enabled: true
      },
      stamp: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${appName.toLowerCase().replace(/\s/g, '_')}_legal_manifest.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 pb-12 text-slate-100 selection:bg-amber-accent/20">
      
      {/* 1. Header Hero Area */}
      <div className="relative p-8 rounded-3xl bg-gradient-to-b from-stone-900/80 to-stone-950/90 border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-accent/10 text-amber-accent text-[10px] font-black uppercase tracking-widest border border-amber-accent/20">
              <ShieldCheck className="w-3.5 h-3.5" /> App Launch Guard Active
            </span>
            <h1 className="font-serif text-3xl font-light tracking-wide text-white">
              App Legal & <span className="italic text-amber-accent">Compliance Readiness</span>
            </h1>
            <p className="text-xs text-slate-400 font-sans max-w-2xl leading-relaxed">
              Ensure your application is legally sound, privacy-compliant, app-store ready, and safe from regulatory disputes. Set up structures, auto-generate responsive policies, model consent banners, map registry elements, and run GDPR log tests.
            </p>
          </div>
          
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleExportJSON}
              className="px-5 py-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 text-slate-200 hover:text-white font-mono text-xs flex items-center gap-2 transition-all"
              title="Download structured compliance layout"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Legal Manifest</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. LIVE PRIVACY WARNING (DYNAMIC TRIGGER) */}
      <AnimatePresence>
        {showPrivacyWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-slate-200 space-y-4 shadow-xl"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-sans text-sm font-bold text-rose-400 tracking-wide uppercase">
                  Your app collects user data and requires a Privacy Policy before launch
                </h3>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Your active inventory data registry declares collection of essential credentials and analytics metrics. Operating without a valid Privacy Policy violates modern app-store guidelines and introduces severe regulatory exposure from EU & US privacy regulators.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">❌ Apple Submissions Rejected</span>
                  <span className="flex items-center gap-1.5">❌ GDPR Non-compliance Risk</span>
                  <span className="flex items-center gap-1.5">❌ Civil Liability exposure</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between pt-2 border-t border-rose-500/15">
              <div className="text-[10px] text-slate-400 italic">
                💡 Fix: Complete your Privacy Policy with the built-in compiler, or link a third-party Termly URL.
              </div>
              <button
                onClick={generateLegalDrafts}
                className="px-4 py-2 bg-rose-500 text-white font-serif text-xs italic font-semibold rounded-xl hover:bg-rose-400 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Compile Instantly & Resolve Warning</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid: Left column ( Checklist + App Settings + Registry ) & Right Column ( Generator + Consent Simulator + GDPR Tool ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CORE LEGAL CONTROLS */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* A. Dynamic Checklist Panel */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-amber-accent" />
                <h2 className="font-serif text-lg font-light text-white">Readiness Checklist</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-amber-accent font-bold">
                {Object.values(checklist).filter(Boolean).length}/7 Complete
              </span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'privacyPolicyCreated', label: 'Privacy Policy Created', desc: 'Compliant details on metadata storage, support, & GDPR.' },
                { key: 'termsAdded', label: 'Terms of Service Configured', desc: 'Acceptable cook protocols, platform limitations, & arbitration rules.' },
                { key: 'dataCollectionDeclared', label: 'Data Collection Registry Declared', desc: 'Registry mapping essential metrics, analytics, and sensitivities.' },
                { key: 'consentFlowsConfigured', label: 'Consent flows configured', desc: 'Active double-opt-in checkout check, cookie selection cards.' },
                { key: 'aiConsentConfigured', label: 'AI Consent Flow Checked', desc: 'Mandatory opt-in, detailing outbound transfer destination (Google Gemini / Google LLC).' },
                { key: 'appNameChecked', label: 'App Trademark Checked', desc: 'Mock validation check on custom culinary logo & trademark.' },
                { key: 'legalPagesLinked', label: 'Legal Pages Linked globally', desc: 'Dynamic navigation paths loaded in Auth signup flow + Navbar.' }
              ].map((item) => {
                const checked = checklist[item.key as keyof typeof checklist];
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleChecklist(item.key as keyof typeof checklist)}
                    className="w-full p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-start text-left gap-3.5 transition-all outline-none"
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                      checked 
                        ? 'bg-amber-accent border-amber-accent text-black' 
                        : 'border-white/20 bg-black/40'
                    }`}>
                      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${checked ? 'text-white line-through opacity-60' : 'text-slate-200'}`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-light mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. App Identity Configurations */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-accent" />
              <h2 className="font-serif text-lg font-light text-white">Entity Configuration</h2>
            </div>
            
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">App Public Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="flex-1 px-4.5 py-3 rounded-xl bg-stone-950/70 border border-white/10 focus:border-amber-accent hover:border-white/20 text-xs text-white outline-none font-medium"
                    placeholder="Daily Meal Recipe"
                  />
                  <button
                    onClick={checkAppNameTrademark}
                    className="px-3.5 py-3 rounded-xl bg-amber-accent text-black hover:bg-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                  >
                    Check
                  </button>
                </div>
                {nameChecked && (
                  <p className={`text-[10px] font-mono mt-1.5 ${nameCheckResult.status === 'checking' ? 'text-amber-accent/70' : nameCheckResult.status === 'valid' ? 'text-emerald-400 font-bold' : 'text-amber-accent'}`}>
                    {nameCheckResult.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">Operator Legal Entity</label>
                <input
                  type="text"
                  value={legalEntity}
                  onChange={(e) => setLegalEntity(e.target.value)}
                  className="w-full px-4.5 py-3 rounded-xl bg-stone-950/70 border border-white/10 focus:border-amber-accent hover:border-white/20 text-xs text-white outline-none"
                  placeholder="Daily Meal Recipe LLC"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">Support/Legal Desk Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-4.5 py-3 rounded-xl bg-stone-950/70 border border-white/10 focus:border-amber-accent hover:border-white/20 text-xs text-white outline-none font-mono"
                  placeholder="legal@dailymealrecipe.online"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">Termly Portal Script CDN / URL (Optional)</label>
                <input
                  type="url"
                  value={termlyUrl}
                  onChange={(e) => setTermlyUrl(e.target.value)}
                  className="w-full px-4.5 py-3 rounded-xl bg-stone-950/70 border border-white/10 focus:border-amber-accent hover:border-white/20 text-xs text-white outline-none font-mono"
                  placeholder="https://app.termly.io/embed/policy/..."
                />
                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                  Provide your third-party Termly URL embed to instantly fetch custom policy layers in client dashboards. Leave blank to rely on the clean default generator.
                </p>
              </div>
            </div>
          </div>

          {/* C. Data Collection Registry Declare Panel */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-accent" />
                <h2 className="font-serif text-lg font-light text-white">Data Registry Mapping</h2>
              </div>
              <span className="text-[9px] font-mono uppercase bg-white/5 text-slate-400 px-2.5 py-1 rounded-full text-right font-bold">
                CCPA Compliant
              </span>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed font-light">
              Toggle data categories processed by the platform. Declared components are automatically classified to satisfy local GDPR transparency mandates.
            </p>

            <div className="space-y-2.5">
              {registry.map((item, index) => (
                <div key={item.key} className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{item.name}</span>
                      <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                        item.category === 'essential' 
                          ? 'bg-amber-accent/10 text-amber-accent border border-amber-accent/20' 
                          : item.category === 'sensitive' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : item.category === 'analytics'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{item.description}</p>
                  </div>

                  {/* Switch */}
                  <button
                    onClick={() => toggleCollected(index)}
                    className={`w-11 h-6 rounded-full p-1 transition-all ${
                      item.collected ? 'bg-amber-accent' : 'bg-white/10'
                    } flex items-center relative cursor-pointer`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-black shadow-md transition-all ${
                      item.collected ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Automatic Categories Group Visualizer */}
            <div className="pt-2">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                <span className="text-[10px] font-mono uppercase text-white/40 font-bold block">Compliance Class Grouping</span>
                <div className="flex flex-wrap gap-1.5 text-[9px] font-semibold text-slate-300">
                  <span className="px-2 py-0.5 rounded-full bg-amber-accent/10 border border-amber-accent/20">Essential: Auth, Payments</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">Analytics: Device, Cookies, IP</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">Sensitive: Allergies/Conditions</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">Marketing: SMS alerts</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: GENERATOR & COMPLIANCE TOOLS */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* I. Dynamic Compiler Box */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-white/5 gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-accent" />
                <h2 className="font-serif text-lg font-light text-white">Dynamic Document Generator</h2>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('policy')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                    activeTab === 'policy' ? 'bg-amber-accent text-black' : 'bg-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => setActiveTab('terms')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-widest transition-all ${
                    activeTab === 'terms' ? 'bg-amber-accent text-black' : 'bg-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  Terms of Service
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-light leading-relaxed">
              Based on active toggle selections, legal operator name: <span className="text-white font-semibold font-mono">{legalEntity}</span> and data mappings, we auto-synthesized compliant legal prose for your launch.
            </p>

            {/* Document Draft Rendering Area */}
            <div className="relative">
              <textarea
                value={activeTab === 'policy' ? policyDraft : termsDraft}
                onChange={(e) => {
                  if (activeTab === 'policy') setPolicyDraft(e.target.value);
                  else setTermsDraft(e.target.value);
                }}
                className="w-full h-80 px-4 py-3 bg-stone-950/90 border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-xl text-xs text-stone-300 font-mono leading-relaxed outline-none"
              />
              <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                <button
                  onClick={() => handleCopy(activeTab === 'policy' ? policyDraft : termsDraft)}
                  className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[10px] uppercase font-bold text-slate-300 hover:bg-white/10 tracking-wider flex items-center gap-1.5 select-none"
                  title="Copy Document Text"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400 italic">
                🔄 Live update bound. Toggle data components or configuration settings to regenerate.
              </span>
              <button
                onClick={generateLegalDrafts}
                className="px-5 py-2.5 bg-amber-accent hover:bg-white text-black text-xs uppercase font-serif italic font-bold tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 text-black" />
                <span>Compile Legal Prose</span>
              </button>
            </div>
          </div>

          {/* II. Interactive Cookie Consent Builder & Simulator */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-amber-accent" />
                <h2 className="font-serif text-lg font-light text-white">GDPR Cookie Banner Customizer</h2>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                Active Simulator
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-light">
              Compliance frameworks require that users understand tracking and consent controls immediately. Design your banner and run local UI simulations here.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">Banner Placement</label>
                <select
                  value={bannerPlacement}
                  onChange={(e) => setBannerPlacement(e.target.value as any)}
                  className="w-full px-4.5 py-3 rounded-xl bg-stone-950 border border-white/10 text-xs text-white outline-none font-medium"
                >
                  <option value="floating">Floating Card (Bottom Left)</option>
                  <option value="bottom">Full Bottom Bar Stripe</option>
                  <option value="top">Top Header Warning Bar</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">Color Palette Theme</label>
                <select
                  value={bannerTheme}
                  onChange={(e) => setBannerTheme(e.target.value as any)}
                  className="w-full px-4.5 py-3 rounded-xl bg-stone-950 border border-white/10 text-xs text-white outline-none font-medium"
                >
                  <option value="amber">Culinary Amber Gold</option>
                  <option value="emerald">Compliance Emerald Green</option>
                  <option value="crimson">High-security Crimson Red</option>
                  <option value="dark">Stealth Obsidian Dark</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">Consent Prose Text</label>
              <textarea
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full h-20 px-4 py-2 bg-stone-950 border border-white/10 focus:border-amber-accent rounded-xl text-xs text-slate-300 font-sans leading-relaxed outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {isCookieConsentSaved ? '✅ Saved banner settings to app configuration' : '⚠️ Unsaved local layout edits'}
              </span>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsCookieConsentSaved(true);
                    if (!checklist.consentFlowsConfigured) {
                      toggleChecklist('consentFlowsConfigured');
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-xs text-white"
                >
                  Save Config
                </button>

                <button
                  type="button"
                  onClick={() => setShowBannerPreview(true)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-accent text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Interactive Test Banner</span>
                </button>
              </div>
            </div>
          </div>

          {/* III. GDPR RIGHT TO BE FORGOTTEN ERASURE LOG SIMULATOR */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-amber-accent" />
                <h2 className="font-serif text-lg font-light text-white">GDPR Data Erasure Simulator</h2>
              </div>
              <span className="text-[9px] font-mono bg-white/5 text-rose-400 px-2.5 py-1 rounded-full text-right font-bold uppercase">
                Right to Erasure
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-light">
              Simulate full database purging sequences to meet standard GDPR/CCPA consumer erasure requirements. Submit an email identifier to inspect structural purging logs.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                value={gdprEmail}
                onChange={(e) => setGdprEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-stone-950/70 border border-white/10 focus:border-amber-accent text-xs font-mono text-white outline-none"
                placeholder="user@cookmaster.fake"
              />
              <button
                type="button"
                onClick={triggerGdprEraseSimulation}
                disabled={gdprStatus === 'running'}
                className="px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-serif italic font-semibold text-xs py-2 transition-all disabled:opacity-50 cursor-pointer text-center select-none"
              >
                {gdprStatus === 'running' ? 'Executing Purge...' : 'Compliant Purge'}
              </button>
            </div>

            {/* GDPR purger terminal logs preview */}
            {(gdprLogs.length > 0 || gdprStatus === 'running') && (
              <div className="p-4 rounded-xl bg-black border border-white/10 font-mono text-[10px] leading-relaxed space-y-2.5 text-stone-300 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between text-white/45 border-b border-white/5 pb-1 text-[9px]">
                  <span>🔒 GDPR COMPLIANT PURGER ENGINE PROXY v1.0.4</span>
                  <span>{gdprStatus === 'running' ? 'EXECUTING STATE' : 'COMPLETED ACTION'}</span>
                </div>
                {gdprLogs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-amber-accent/70 font-semibold select-none">❯</span>
                    <span>{log}</span>
                  </div>
                ))}
                {gdprStatus === 'running' && (
                  <div className="flex items-center gap-2 text-amber-accent animate-pulse text-[9px] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-accent animate-ping" />
                    <span>Draining database locks, clearing indices...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* IV. CORE AI DATA DISCLOSURE & CONSENT GATEWAY AUDIT */}
          <div className="p-6 rounded-2xl bg-stone-900/40 border border-white/5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-accent" />
                <h2 className="font-serif text-lg font-light text-white">AI Consent Gateway Audit</h2>
              </div>
              <span className="text-[9px] font-mono bg-white/5 text-amber-accent px-2.5 py-1 rounded-full text-right font-bold uppercase">
                Transparency Gate
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-light">
              Compliance guidelines require active user disclosures before transferring local ingredients, dietary records, or conditions to generative models. Review compliance settings below.
            </p>

            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-2.5 font-sans">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">External Model Destination</span>
                <span className="font-mono text-[10px] text-white font-bold uppercase">Google Gemini API (Google LLC)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Data Transfer Security</span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase">TLS 1.3 End-to-End Encrypted</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Local Consent Register State</span>
                {hasAIConsented ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono uppercase font-bold text-emerald-450">Authorized (True)</span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-450 text-[9px] font-mono uppercase font-bold text-rose-500">Pending (False)</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={revokeAIConsent}
                disabled={!hasAIConsented}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 disabled:opacity-30 disabled:pointer-events-none text-xs text-center font-semibold font-sans transition-all cursor-pointer"
              >
                Reset AI Consent
              </button>

              <div className="flex-1 text-[10px] text-white/40 italic flex items-center justify-center text-center">
                Consent integrated in Terms & Privacy Policy
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 4. DYNAMIC INTERACTIVE COOKIE CONSENT BANNER OVERLAY SIMULATOR */}
      <AnimatePresence>
        {showBannerPreview && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-stretch justify-stretch select-none">
            
            {/* Dark interactive overlay bounds block click on background */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] pointer-events-auto" onClick={() => setShowBannerPreview(false)} />

            {/* Simulated app screen banner content based on placement configuration */}
            <motion.div
              initial={
                bannerPlacement === 'top'
                  ? { top: -100, opacity: 0 }
                  : bannerPlacement === 'floating'
                  ? { bottom: 20, left: -400, opacity: 0 }
                  : { bottom: -200, opacity: 0 }
              }
              animate={
                bannerPlacement === 'top'
                  ? { top: 20, opacity: 1 }
                  : bannerPlacement === 'floating'
                  ? { bottom: 30, left: 30, opacity: 1 }
                  : { bottom: 0, opacity: 1 }
              }
              exit={
                bannerPlacement === 'top'
                  ? { top: -100, opacity: 0 }
                  : bannerPlacement === 'floating'
                  ? { bottom: 20, left: -400, opacity: 0 }
                  : { bottom: -200, opacity: 0 }
              }
              transition={{ type: 'spring', damping: 20 }}
              className={`fixed pointer-events-auto z-50 shadow-2xl p-6 border transition-all duration-300 ${
                bannerPlacement === 'floating'
                  ? 'max-w-md rounded-3xl mx-4'
                  : 'left-0 right-0'
              } ${
                bannerTheme === 'amber'
                  ? 'bg-stone-900 border-amber-accent/30 text-slate-100 shadow-amber-accent/5'
                  : bannerTheme === 'emerald'
                  ? 'bg-stone-900 border-emerald-500/30 text-slate-100 shadow-emerald-500/5'
                  : bannerTheme === 'crimson'
                  ? 'bg-stone-900 border-rose-500/30 text-slate-100 shadow-rose- gold/5'
                  : 'bg-black border-white/10 text-slate-300'
              } ${bannerPlacement === 'top' ? 'top-0' : bannerPlacement === 'floating' ? 'bottom-5 left-5' : 'bottom-0'}`}
            >
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    bannerTheme === 'amber'
                      ? 'bg-amber-accent/10 text-amber-accent'
                      : bannerTheme === 'emerald'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : bannerTheme === 'crimson'
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-white/5 text-slate-300'
                  }`}>
                    <Cookie className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono tracking-widest text-white/50 block font-black uppercase">GDPR Tracking Consent Controller</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{appName} Privacy Compliance</h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-light">{bannerText}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] uppercase font-mono border-t border-white/5 pt-3.5">
                  <button
                    onClick={() => setShowBannerPreview(false)}
                    className="px-4 py-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white"
                  >
                    Manage Choices
                  </button>
                  <button
                    onClick={() => {
                      setShowBannerPreview(false);
                      alert('Accepting Cookie consent simulation! Custom settings deployed.');
                    }}
                    className={`px-4.5 py-2 rounded-lg font-bold text-black ${
                      bannerTheme === 'amber'
                        ? 'bg-amber-accent hover:bg-white'
                        : bannerTheme === 'emerald'
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                        : bannerTheme === 'crimson'
                        ? 'bg-rose-500 hover:bg-rose-400 text-white'
                        : 'bg-white hover:bg-stone-200'
                    }`}
                  >
                    Accept Cookies
                  </button>
                </div>
              </div>
            </motion.div>

          </div>
        )}
      </AnimatePresence>



    </div>
  );
}
