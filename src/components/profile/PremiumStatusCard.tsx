import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Clock, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePremium } from '@/hooks/usePremium';
import { toast } from 'sonner';

interface PremiumStatusCardProps {
  userId: string;
}

export const PremiumStatusCard = ({ userId }: PremiumStatusCardProps) => {
  const { isPremium, loading, source, expiresAt, hasPendingRequest, requestTrial } = usePremium(userId);
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  if (loading) return null;

  const handleRequest = async () => {
    setRequesting(true);
    const success = await requestTrial(message || undefined);
    if (success) {
      toast.success('Trial request sent! You\'ll be notified when approved.');
      setShowForm(false);
      setMessage('');
    } else {
      toast.error('Failed to send request. Please try again.');
    }
    setRequesting(false);
  };

  if (isPremium) {
    const daysLeft = expiresAt
      ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <motion.div
        className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-6 border border-amber-200 dark:border-amber-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2">
              Premium Active
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h3>
            <p className="text-sm text-muted-foreground">
              {source === 'trial' ? 'Free Trial' : 'Premium'} · {daysLeft != null ? `${daysLeft} days remaining` : 'Active'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-card rounded-2xl shadow-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
          <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Upgrade to Premium</h3>
          <p className="text-sm text-muted-foreground">
            Unlock hints, AI analysis, full reports & more
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {['Hints on all questions', 'AI Session Analysis', 'Full Report History', 'Spaced Repetition', 'Unlimited Adaptive', 'Olympiad Practice'].map(feature => (
          <div key={feature} className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            {feature}
          </div>
        ))}
      </div>

      {hasPendingRequest ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-sm">
          <Clock className="w-4 h-4" />
          Your trial request is pending approval
        </div>
      ) : showForm ? (
        <div className="space-y-3">
          <Input
            placeholder="Why would you like a trial? (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleRequest} disabled={requesting} size="sm">
              {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
              Send Request
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          <Crown className="w-4 h-4 mr-2" />
          Request Free Trial
        </Button>
      )}
    </motion.div>
  );
};
