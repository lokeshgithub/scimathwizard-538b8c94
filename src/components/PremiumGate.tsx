import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Crown, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePremium, type PremiumFeature } from '@/hooks/usePremium';
import { toast } from 'sonner';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: ReactNode;
  /** Show inline lock instead of replacing content */
  inline?: boolean;
  /** Custom message for the gate */
  message?: string;
}

const featureLabels: Record<PremiumFeature, string> = {
  hints: 'Hints',
  ai_analysis: 'AI Session Analysis',
  full_reports: 'Full Report History',
  spaced_repetition: 'Spaced Repetition',
  unlimited_adaptive: 'Unlimited Adaptive Challenges',
  olympiad: 'Olympiad Practice',
  ad_free: 'Ad-Free Experience',
};

export const PremiumGate = ({ feature, children, inline = false, message }: PremiumGateProps) => {
  const { user } = useAuth();
  const { isPremium, loading, hasPendingRequest, requestTrial } = usePremium(user?.id);

  if (loading) {
    if (inline) return null;
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  const handleRequestTrial = async () => {
    if (!user) {
      toast.error('Please sign in first to request a trial');
      return;
    }
    const success = await requestTrial();
    if (success) {
      toast.success('Trial request sent! You\'ll be notified when approved.');
    } else {
      toast.error('Failed to send request. Please try again.');
    }
  };

  if (inline) {
    return (
      <button
        onClick={handleRequestTrial}
        disabled={hasPendingRequest}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
      >
        <Crown className="w-3.5 h-3.5" />
        {hasPendingRequest ? 'Trial Requested' : 'Premium Feature'}
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 p-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
    >
      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
        <Crown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">
          {featureLabels[feature]} — Premium
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {message || `Upgrade to Premium to unlock ${featureLabels[feature].toLowerCase()} and accelerate your learning.`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleRequestTrial}
          disabled={hasPendingRequest}
          variant="outline"
          size="sm"
          className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
        >
          {hasPendingRequest ? '✓ Trial Requested' : 'Request Free Trial'}
        </Button>
      </div>
    </motion.div>
  );
};

/**
 * Hook-based check for conditional rendering in existing components
 */
export const usePremiumCheck = () => {
  const { user } = useAuth();
  const premium = usePremium(user?.id);
  return premium;
};
