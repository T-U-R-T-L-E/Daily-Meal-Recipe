import { Navigate, useLocation } from 'react-router-dom';
import { useSubscription } from '../../lib/useSubscription';
import { useAuth } from '../../lib/useAuth';
import { motion } from 'motion/react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user } = useAuth();
  const { isActive, loading } = useSubscription();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // If there is no user, let them pass (it's a public page context like Discover)
  if (!user) {
    return <>{children}</>;
  }

  if (!isActive && location.pathname !== '/subscription' && location.pathname !== '/profile') {
    return <Navigate to="/subscription" replace />;
  }

  return <>{children}</>;
}
