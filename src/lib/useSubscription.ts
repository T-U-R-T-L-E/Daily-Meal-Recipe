import { useAuth } from './useAuth';

export function useSubscription() {
  const { profile, loading } = useAuth();

  if (loading) return { loading: true, isActive: true };
  if (!profile) return { loading: false, isActive: false };

  const { subscription } = profile;
  
  if (!subscription) return { loading: false, isActive: false };

  // If already active premium
  if (subscription.status === 'active') {
    return { loading: false, isActive: true };
  }

  // If in trial, check date
  if (subscription.status === 'trial') {
    const trialEnd = new Date(subscription.trialEndDate).getTime();
    const now = Date.now();
    const isExpired = now > trialEnd;
    const rawDaysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    
    return { 
      loading: false, 
      isActive: !isExpired,
      trialDaysLeft: Math.min(14, rawDaysLeft)
    };
  }

  return { loading: false, isActive: false };
}
