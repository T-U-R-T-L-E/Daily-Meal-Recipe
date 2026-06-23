import { useState, useEffect } from 'react';
import { BadgePercent, ArrowLeft, ExternalLink, ShieldCheck, Mail, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RefundPolicyPage() {
  const [refundText, setRefundText] = useState('');
  const [appName, setAppName] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('legal_app_name') || 'Daily Meal Recipe';
    const savedEntity = localStorage.getItem('legal_entity_name') || 'Daily Meal Recipe LLC';
    const savedEmail = localStorage.getItem('legal_support_email') || 'info@dailymealrecipe.online';
    setAppName(savedName);

    const defaultBody = `REFUND AND RETURN POLICY

Last Updated: June 2026

At ${savedName} ("we," "our," or "us"), operated under ${savedEntity}, we want you to be completely satisfied with your premium experience. That is why we provide a clear, fair, and transparent Refund Policy for all premium subscription purchases of Daily Meal Recipe Plus.

1. 14-DAY HASSLE-FREE GUARANTEE
We offer an absolute 14-day money-back guarantee for first-time premium subscribers.
- If you upgrade to Daily Meal Recipe Plus and find that it does not fit your digital kitchen requirements, you are eligible for a complete refund of your original subscription payment.
- To claim a refund, you must submit an express written request to our support desk within precisely 14 calendar days of your initial transaction.

2. CANCELLATIONS & RENEWAL POLICY
- Subscription fees are billed on a recurring monthly cycle.
- You can cancel your subscription at any time directly through your Profile page settings.
- Cancellations stop future recurring renewals. However, after the first 14 days of your contract, any active or already-billed subscription cycles are non-refundable.

3. METHOD OF REIMBURSEMENT
- Approved refunds will be processed immediately back to the original funding card or source using our secure Paystack checkout gateway.
- Please note that depending on your financial institution, the refund settlement can take between 5 to 10 business days to reflect in your account ledger.

4. SYSTEM HEALTH AND ABUSE RESTRICTIONS
- To prevent abuse of our generative AI or visual scanner services, refund eligibility is completely voided if the account system flags serious violations of our Terms of Service.
- Heavy automated scraping of recipes, API hijacking, database injections, or malicious credentials tampering is strictly forbidden and voids all satisfaction claims.

Should you wish to initiate a refund request or clarify your billing status, please email: ${savedEmail}.`;

    const savedRefunds = localStorage.getItem('legal_refund_draft') || defaultBody;
    setRefundText(savedRefunds);
  }, []);

  return (
    <div className="min-h-screen bg-onyx py-12 px-4 sm:px-6 text-gray-300 flex flex-col justify-between">
      <div className="max-w-3xl mx-auto space-y-8 w-full">
        
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-300 transition-all"
          >
            <span>Legal Desk Hub</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Paper Layout Card */}
        <div className="relative p-8 sm:p-10 rounded-3xl bg-graphite border border-white/5 shadow-2xl overflow-hidden leading-relaxed">
          <div className="absolute top-0 right-0 w-60 h-60 bg-amber-accent/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-5">
              <div className="p-3 bg-amber-accent/10 text-amber-accent rounded-2xl">
                <BadgePercent className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="font-serif text-2xl font-light text-white">Refund Policy</h1>
                <p className="text-[10px] uppercase font-mono tracking-widest text-gray-400">
                  {appName} Plus billing guarantee • Satisfaction Verified
                </p>
              </div>
            </div>

            {/* Render with neat spacing */}
            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-gray-300 hover:text-white leading-relaxed space-y-4 font-light border-b border-white/5 pb-6">
              {refundText}
            </div>

            {/* Trust and Safety Dashboard */}
            <div className="pt-2 text-left space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-accent/10 p-1.5 rounded-lg text-amber-accent">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Secure Billing & Refund standards</h4>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Verified Merchant
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Assurance Card */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors">
                  <BadgePercent className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">14-Day Money Back</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      100% refund during your first two weeks, processing directly back to original card payments.
                    </p>
                  </div>
                </div>

                {/* Secure Gateway */}
                <div className="p-3.5 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-2xl flex items-start gap-3 transition-colors">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Paystack Secured Gateways</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-light">
                      Tokens and credit details are never stored on-server. Complete PCI-DSS verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact info */}
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-[10px] text-gray-400 flex items-center gap-3">
              <Mail className="w-5 h-5 text-amber-accent/50 shrink-0" />
              <p>
                Have questions or need help initiating a cancellation or refund? Feel free to write our friendly community team directly. We are always happy to help!
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-gray-500 uppercase font-mono tracking-widest">
          © {new Date().getFullYear()} {appName} • All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
