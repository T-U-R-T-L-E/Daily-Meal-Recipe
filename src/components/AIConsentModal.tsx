import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Server, Send, Scale, Eye, HelpCircle, Check, X, ArrowRight, AlertCircle, Info } from 'lucide-react';

interface AIConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline?: () => void;
  dataTypesToSend?: string[];
}

export default function AIConsentModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  onDecline,
  dataTypesToSend = ['Ingredients list', 'Allergies / Dietary settings', 'Meal category selections', 'Recipe query keys']
}: AIConsentModalProps) {
  const [consentDietary, setConsentDietary] = useState(false);
  const [consentVerification, setConsentVerification] = useState(false);
  const [showDatalines, setShowDatalines] = useState(false);

  // Clear consent ticks when reopened
  useEffect(() => {
    if (isOpen) {
      setConsentDietary(false);
      setConsentVerification(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (consentDietary && consentVerification) {
      localStorage.setItem('ai_consent_accepted', 'true');
      onAccept();
      onClose();
    }
  };

  const handleRefuse = () => {
    if (onDecline) {
      onDecline();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleRefuse}
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-md pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden text-slate-100 z-10 font-sans"
          >
            {/* Visual glow background */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-accent/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-rose-500/5 rounded-full blur-[60px] pointer-events-none" />

            {/* Header Area */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-accent/10 border border-amber-accent/20 text-amber-accent rounded-2xl">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-accent/80 block">
                    Security Disclosure Gateway
                  </span>
                  <h3 className="font-serif text-xl font-normal text-white">
                    AI Processing Consent
                  </h3>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-accent/5 border border-amber-accent/15 space-y-2">
                <div className="flex items-start gap-2 text-[11px] text-amber-accent leading-relaxed">
                  <Server className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">DATA DESTINATION TRANSPARENCY:</span> All submitted ingredients, search parameters, and health filters are securely transmitted to <span className="underline font-semibold text-white">Google Gemini API servers Operated by Google LLC</span> (using secure regional zones for optimization).
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-light">
                To generate delicious, custom-tailored dishes and search the global library, our Artisanal AI parses your entries. Please review how your personal configurations are disclosed.
              </p>
            </div>

            {/* Core Disclosure Body */}
            <div className="my-5 space-y-4">
              {/* Collapsible Details */}
              <div className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDatalines(!showDatalines)}
                  className="w-full px-4 py-3 bg-white/[0.01] hover:bg-white/[0.03] flex items-center justify-between text-xs font-semibold text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-amber-accent" />
                    <span>Inspect Outbound Payload Components</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {showDatalines ? 'Hide' : 'Show Details'} ({dataTypesToSend.length})
                  </span>
                </button>

                {showDatalines && (
                  <div className="px-4 pb-3 pt-1 border-t border-white/5 space-y-2 text-[10px] font-mono text-slate-400">
                    <div className="space-y-1">
                      {dataTypesToSend.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-white/5 text-[9px] leading-relaxed italic">
                      🔒 Zero operational metadata (like account passwords, support logs, or Paystack subscription keys) is ever attached or shared with outside model vendors.
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings Checklist */}
              <div className="space-y-3">
                {/* Checkbox 1 */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 cursor-pointer selection:bg-transparent">
                  <input
                    type="checkbox"
                    checked={consentDietary}
                    onChange={(e) => setConsentDietary(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`mt-0.5 w-4.5 h-4.5 rounded border transition-all flex items-center justify-center shrink-0 ${
                    consentDietary 
                      ? 'bg-amber-accent border-amber-accent text-black' 
                      : 'border-white/20 bg-black'
                  }`}>
                    {consentDietary && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold text-slate-200 leading-snug">
                      Consent to Transfer Personal Profile Parameters
                    </p>
                    <p className="text-[10px] text-slate-400 font-light leading-normal">
                      I authorize the transmission of ingredients, allergy categories, and pantry setups to Google Gemini API servers (Google LLC) to calculate secure dish combinations.
                    </p>
                  </div>
                </label>

                {/* Checkbox 2 */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 cursor-pointer selection:bg-transparent">
                  <input
                    type="checkbox"
                    checked={consentVerification}
                    onChange={(e) => setConsentVerification(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`mt-0.5 w-4.5 h-4.5 rounded border transition-all flex items-center justify-center shrink-0 ${
                    consentVerification 
                      ? 'bg-amber-accent border-amber-accent text-black' 
                      : 'border-white/20 bg-black'
                  }`}>
                    {consentVerification && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold text-slate-200 leading-snug">
                      Manual Ingredient Verification Agreement
                    </p>
                    <p className="text-[10px] text-slate-400 font-light leading-normal">
                      I understand that generative AI calculations are non-deterministic, can hallucinate, and cannot substitute physical allergen inspections. It is my absolute duty to check all food packages manually.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Error Message if buttons clicked without consent */}
            {(!consentDietary || !consentVerification) && (
              <div className="flex items-center gap-1.5 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10 text-[10px] text-rose-400 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>You must tick both consent agreements to authorize AI processing</span>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch justify-end mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handleRefuse}
                className="px-5 py-2.5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-medium cursor-pointer transition-all"
              >
                Decline & Cancel
              </button>
              
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!consentDietary || !consentVerification}
                className="px-6 py-2.5 bg-amber-accent hover:bg-white text-black disabled:opacity-30 disabled:pointer-events-none rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Authorize & Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
