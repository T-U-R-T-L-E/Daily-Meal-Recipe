import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { cn } from './utils';

export type ErrorSeverity = 'toast' | 'modal' | 'inline';
export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalItem {
  id: string;
  title: string;
  message: string;
  severity?: 'critical' | 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  closeLabel?: string;
  onClose?: () => void;
}

interface ErrorUXContextType {
  toasts: ToastItem[];
  modal: ModalItem | null;
  showToast: (message: string, type?: ToastType, options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>) => void;
  dismissToast: (id: string) => void;
  showModal: (config: Omit<ModalItem, 'id'>) => void;
  dismissModal: () => void;
  /**
   * Intelligently routes and handles any thrown error based on severity, error codes, and context.
   */
  handleError: (
    error: any,
    context?: {
      componentName?: string;
      actionName?: string;
      preferredPlacement?: ErrorSeverity;
      onRetry?: () => void;
    }
  ) => string | null; // Returns string if should be displayed inline, or null if handled by toast/modal
}

const ErrorUXContext = createContext<ErrorUXContextType | undefined>(undefined);

export function useErrorUX() {
  const context = useContext(ErrorUXContext);
  if (!context) {
    throw new Error('useErrorUX must be used within an ErrorUXProvider');
  }
  return context;
}

export const ErrorUXProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modal, setModal] = useState<ModalItem | null>(null);

  // Expose toast dismissal
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Show a smart toast (limited to 3 max to prevent layout clutter and overwhelming the user)
  const showToast = useCallback((
    message: string,
    type: ToastType = 'error',
    options?: Partial<Omit<ToastItem, 'id' | 'message' | 'type'>>
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastItem = {
      id,
      type,
      message,
      duration: options?.duration || (type === 'error' ? 4000 : 3000),
      action: options?.action,
    };

    setToasts((prev) => {
      const active = [...prev, newToast];
      if (active.length > 3) {
        return active.slice(active.length - 3); // keep only last 3
      }
      return active;
    });
  }, []);

  // Show modal
  const showModal = useCallback((config: Omit<ModalItem, 'id'>) => {
    setModal({
      id: Date.now().toString(),
      ...config,
    });
  }, []);

  // Dismiss modal
  const dismissModal = useCallback(() => {
    if (modal?.onClose) {
      try {
        modal.onClose();
      } catch (err) {
        console.error(err);
      }
    }
    setModal(null);
  }, [modal]);

  // Handle errors intelligently based on system rules and the 3-part UX principle
  const handleError = useCallback((
    error: any,
    context?: {
      componentName?: string;
      actionName?: string;
      preferredPlacement?: ErrorSeverity;
      onRetry?: () => void;
    }
  ): string | null => {
    // Log technical trace for developer logs securely (never exposed in the UI)
    console.error(`[Developer Log Only] Error captured in ${context?.componentName || 'unknown'}:${context?.actionName || 'unknown'}:`, error);

    const rawMsg = error?.message || error?.details || String(error || '');
    const code = error?.code || '';
    const lowercaseMsg = (rawMsg + ' ' + (typeof code === 'string' ? code : '')).toLowerCase();

    // 3-Part Error Structure variables
    let what = 'The kitchen planner encountered an unexpected issue.';
    let why = 'The server reported a temporary response variation.';
    let next = 'Please wait a moment and click retry to reload the data.';
    let severity: ErrorSeverity = context?.preferredPlacement || 'toast';

    // A. CLASSIFY & TRANSLATE SYSTEM ERRORS USING HUMAN-CENTERED 3-PART CONSTRAINTS
    
    // 1. Connection / Network status
    if (
      lowercaseMsg.includes('network') || 
      lowercaseMsg.includes('offline') || 
      lowercaseMsg.includes('failed to fetch') || 
      lowercaseMsg.includes('connection failed') ||
      lowercaseMsg.includes('connecting')
    ) {
      what = 'We could not connect to our daily culinary database.';
      why = 'Your internet connection appears to be offline or temporarily unstable.';
      next = 'Please check your network signal or Wi-Fi status, then click retry.';
      severity = 'toast';
    }
    // 2. Firebase permission denied / Security locks
    else if (
      lowercaseMsg.includes('permission') || 
      lowercaseMsg.includes('unauthorized') || 
      lowercaseMsg.includes('access-denied')
    ) {
      what = 'Your profile does not have permission to modify this section.';
      why = 'Your current subscription plan or authentication session does not allow editing kitchen files.';
      next = 'Please sign in again to verify your user authentication or choose an authorized account.';
      severity = 'modal';
    }
    // 3. Subscription & Premium restrictions
    else if (
      lowercaseMsg.includes('subscription') || 
      lowercaseMsg.includes('premium') || 
      lowercaseMsg.includes('upgrade') || 
      lowercaseMsg.includes('quota')
    ) {
      what = 'This intelligent kitchen visualizer tool is reserved for premium subscribers.';
      why = 'Your account has reached the daily limit of generation requests on the starter tier.';
      next = 'Please consider upgrading your membership plan to unlock unrestricted culinary tools.';
      severity = 'modal';
    }
    // 4. File uploads & storage capacity limits
    else if (lowercaseMsg.includes('storage') || lowercaseMsg.includes('vault') || lowercaseMsg.includes('exceed')) {
      if (lowercaseMsg.includes('capacity') || lowercaseMsg.includes('full')) {
        what = 'Your secure recipe vault package could not write the current document.';
        why = 'Your total uploaded file cache size is exceeding the 2GB memory allocation limit.';
        next = 'We suggest deleting some older recipes or food pictures to make space for your new plans.';
      } else {
        what = 'Your cooking record upload could not be completed successfully.';
        why = 'The chosen PDF or scan document size exceeds the transfer limits of your secure vault.';
        next = 'Please save your files below 10MB or use a standard image format before trying again.';
      }
      severity = 'toast';
    }
    // 5. Authentication: Email Already in Use
    else if (lowercaseMsg.includes('email-already-in-use') || lowercaseMsg.includes('already registered')) {
      what = 'This email address is already bound to a culinary profile.';
      why = 'A registered account is already actively using the email specified on our platform.';
      next = 'Please return to the login screen and enter your password or request a secure reset link.';
      severity = 'inline';
    }
    // 6. Authentication: Invalid Credential / Incorrect password
    else if (
      lowercaseMsg.includes('invalid-credential') || 
      lowercaseMsg.includes('wrong-password') || 
      lowercaseMsg.includes('incorrect password')
    ) {
      what = 'We could not sign you in to your secure kitchen panel.';
      why = 'The credentials entered do not match any records found on our authorization server.';
      next = 'Kindly audit your password for spelling or uppercase characters and try again, or trigger a secure password recovery request.';
      severity = 'inline';
    }
    // 7. Authentication: User Not Found
    else if (lowercaseMsg.includes('user-not-found') || lowercaseMsg.includes('no account associated')) {
      what = 'We could not detect a registered kitchen profile for this email address.';
      why = 'No matching subscription account found with the details you entered.';
      next = 'Please check the spelling of your email address, or toggle to Sign Up to create a new profile.';
      severity = 'inline';
    }
    // 8. Authentication: Too Many Requests / System Abuse lockout
    else if (lowercaseMsg.includes('too-many-requests') || lowercaseMsg.includes('locked out') || lowercaseMsg.includes('blocked')) {
      what = 'Your kitchen account sign-in attempts have been restricted for security reasons.';
      why = 'Too many failed password submission requests were sent in a brief interval of time.';
      next = 'To protect your private recipes and data from intruders, please try again in a few minutes.';
      severity = 'modal';
    }
    // 9. Weak passwords
    else if (lowercaseMsg.includes('weak-password') || lowercaseMsg.includes('password is too weak')) {
      what = 'The secure code you generated is vulnerable to security scans.';
      why = 'Your selected password contains too few characters or lacks balanced symbols.';
      next = 'To meet modern web kitchen standards, draft a password containing at least 6 letters including numbers.';
      severity = 'inline';
    }
    // 10. Forms / Missing parameters
    else if (
      lowercaseMsg.includes('validation') || 
      lowercaseMsg.includes('invalid field') || 
      lowercaseMsg.includes('required') ||
      lowercaseMsg.includes('missing')
    ) {
      what = 'Your submission form could not be updated.';
      why = 'One or more required kitchen fields contains blanks or invalid formats.';
      next = 'Please review your highlighted input boxes and specify a valid value to proceed.';
      severity = 'inline';
    }
    // 11. Custom Generator/Gemini API error
    else if (lowercaseMsg.includes('gemini') || lowercaseMsg.includes('api key') || lowercaseMsg.includes('model') || lowercaseMsg.includes('generate')) {
      what = 'Our recipe generator assistant was unable to finalize your food plan.';
      why = 'Our system limits or verification parameters for automated AI composition are momentarily overloaded.';
      next = 'Please modify your custom ingredients slightly and click generate again, or try reloading the generator hub.';
      severity = 'toast';
    }

    // Build the finalized, beautifully descriptive 3-part message block
    const formattedUserFriendlyMessage = `${what} ${why} ${next}`;

    // B. ROUTE DECORATIVE ERRORS ACCORDING TO DESIRED PLACEMENT LAYOUTS
    if (severity === 'modal') {
      let title = 'Access Blocked';
      if (lowercaseMsg.includes('subscription') || lowercaseMsg.includes('premium')) {
        title = 'Upgrade Premium Required';
      } else if (lowercaseMsg.includes('permission')) {
        title = 'Authorized Access Required';
      } else if (lowercaseMsg.includes('too-many-requests')) {
        title = 'Account Security Lockout';
      }

      showModal({
        title,
        message: formattedUserFriendlyMessage,
        severity: 'critical',
        actionLabel: lowercaseMsg.includes('subscription') ? 'Unlock Premium Tier' : 'Acknowledge',
        onAction: lowercaseMsg.includes('subscription') ? () => {
          window.location.href = '/subscription';
        } : undefined,
      });

      return null;
    }

    if (severity === 'inline') {
      return formattedUserFriendlyMessage;
    }

    // Default to Toast layout
    showToast(formattedUserFriendlyMessage, 'error', {
      duration: 5000,
      action: context?.onRetry ? {
        label: 'Retry Action',
        onClick: context.onRetry,
      } : undefined
    });

    return null;
  }, [showToast, showModal]);

  // Listen to Escape key to dismiss active blocking modal for complete keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal) {
        dismissModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal, dismissModal]);

  return (
    <ErrorUXContext.Provider value={{ toasts, modal, showToast, dismissToast, showModal, dismissModal, handleError }}>
      {children}
      <ErrorUXRenderer />
    </ErrorUXContext.Provider>
  );
};

/**
 * Renders Toast Notifications and Overlay Modals using smooth, polished transitions.
 * Fully optimized for screen readers and high contrast.
 */
const ErrorUXRenderer: React.FC = () => {
  const { toasts, modal, dismissToast, dismissModal } = useErrorUX();

  // Focus trap on overlay modal mount
  const modalButtonRef = React.useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modal && modalButtonRef.current) {
      modalButtonRef.current.focus();
    }
  }, [modal]);

  return (
    <>
      {/* Toast Notifications Queue */}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full outline-none pointer-events-none"
        role="live"
        aria-live="assertive"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const isError = toast.type === 'error';
            const isSuccess = toast.type === 'success';
            const isWarning = toast.type === 'warning';

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="pointer-events-auto w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-xl shadow-black/40 overflow-hidden flex flex-col"
              >
                <div className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {isError && <AlertCircle className="w-5 h-5 text-rose-450" style={{ color: '#fb7185' }} />}
                    {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium select-text break-words pr-2">
                      {toast.message}
                    </p>
                    {toast.action && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.action?.onClick();
                          dismissToast(toast.id);
                        }}
                        className="mt-2 text-[10px] uppercase font-bold text-amber-accent hover:text-amber-300 transition-colors tracking-wider flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin duration-1000" />
                        {toast.action.label}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="p-1 text-slate-400 hover:text-slate-105 hover:bg-slate-800 rounded-lg transition-all"
                    aria-label="Dismiss alert toast"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Visual duration progress indicator */}
                {toast.duration && (
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                    className={`h-0.5 ${isSuccess ? 'bg-emerald-500' : isError ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'}`}
                    onAnimationComplete={() => dismissToast(toast.id)}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Blocking Alert Dialog Modal */}
      <AnimatePresence>
        {modal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
          >
            {/* Ambient Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissModal}
              className="absolute inset-0 bg-black/85 backdrop-blur-[6px]"
            />

            {/* Modal Body Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-stone-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 overflow-hidden flex flex-col space-y-6"
            >
              {/* Top ambient color-toned glow strip based on critical rating */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-pulse" />

              <div className="flex items-start gap-4 pt-3">
                <div className="p-3 bg-rose-500/10 rounded-2xl shrink-0">
                  <AlertCircle className="w-6 h-6 text-rose-455" style={{ color: '#f43f5e' }} />
                </div>
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 
                    id="modal-title" 
                    className="font-serif text-lg font-light text-white tracking-wide leading-snug"
                  >
                    {modal.title}
                  </h3>
                  <p 
                    id="modal-message" 
                    className="text-xs text-slate-400 leading-relaxed font-sans select-text break-words"
                  >
                    {modal.message}
                  </p>
                </div>
              </div>

              {/* Lower Section Buttons Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={dismissModal}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400 hover:text-white transition-all tracking-wider"
                >
                  {modal.closeLabel || 'Dismiss'}
                </button>

                {modal.actionLabel && modal.onAction && (
                  <button
                    ref={modalButtonRef}
                    type="button"
                    onClick={() => {
                      modal.onAction?.();
                      dismissModal();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-serif text-xs font-medium text-black rounded-xl transition-all shadow-lg shadow-amber-500/15 tracking-wider active:scale-[0.98]"
                  >
                    {modal.actionLabel}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

interface InlineErrorHelperProps {
  message: string | null | undefined;
  className?: string;
  id?: string;
}

/**
 * An accessible Inline Error Helper with subtle red warnings and clean slide-in transitions.
 */
export const InlineErrorHelper: React.FC<InlineErrorHelperProps> = ({ message, className, id }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          id={id}
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.18 }}
          className={cn("text-[11px] font-medium text-red-400 flex items-center gap-1.5 pt-1.5 select-text leading-tight", className)}
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
