import { useAuth } from './useAuth';

export function useSubscription() {
  const { profile, loading } = useAuth();

  if (loading) return { loading: true, isActive: true, status: 'none' as const };
  if (!profile) return { loading: false, isActive: false, status: 'none' as const };

  const { subscription } = profile;
  
  if (!subscription) return { loading: false, isActive: false, status: 'none' as const };

  const status = subscription.status;

  // Active - Grant full premium access
  if (status === 'active') {
    return { loading: false, isActive: true, status };
  }

  // Trial - Grant full premium access until trialEndDate
  if (status === 'trial') {
    const trialEnd = subscription.trialEndDate ? new Date(subscription.trialEndDate).getTime() : 0;
    const now = Date.now();
    const isExpired = now > trialEnd;
    const rawDaysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    
    return { 
      loading: false, 
      isActive: !isExpired,
      status,
      trialDaysLeft: Math.min(14, rawDaysLeft)
    };
  }

  // Past Due - The card failed. Keep temporary access but show a warning banner to update payment.
  if (status === 'past_due') {
    return {
      loading: false,
      isActive: true, // Keep temporary access
      isPastDue: true,
      status
    };
  }

  // Canceled - Let them use the app until the billing cycle ends, then revoke access.
  if (status === 'canceled') {
    const endDate = subscription.trialEndDate || (subscription as any).endDate;
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      const now = Date.now();
      const isExpired = now > endMs;
      const rawDaysLeft = Math.max(0, Math.ceil((endMs - now) / (1000 * 60 * 60 * 24)));
      return {
        loading: false,
        isActive: !isExpired,
        isCanceled: true,
        daysLeft: rawDaysLeft,
        endDate,
        status
      };
    }
    // If no end date specified, default to expired
    return {
      loading: false,
      isActive: false,
      isCanceled: true,
      status
    };
  }

  // Unpaid - Immediately lock the premium features and prompt for reactivation.
  if (status === 'unpaid') {
    return {
      loading: false,
      isActive: false,
      isUnpaid: true,
      status
    };
  }

  // Expired
  if (status === 'expired') {
    return {
      loading: false,
      isActive: false,
      status
    };
  }

  return { loading: false, isActive: false, status };
}
