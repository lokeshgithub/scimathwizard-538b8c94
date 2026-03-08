import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PremiumStatus {
  isPremium: boolean;
  loading: boolean;
  source: string | null;
  expiresAt: string | null;
  /** Request a free trial. Returns true if request was created. */
  requestTrial: (message?: string) => Promise<boolean>;
  /** Whether user has a pending trial request */
  hasPendingRequest: boolean;
  /** Refresh premium status */
  refresh: () => Promise<void>;
}

export const usePremium = (userId: string | undefined): PremiumStatus => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const checkPremium = useCallback(async () => {
    if (!userId) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    try {
      // Check active premium access
      const { data: access } = await supabase
        .from('premium_access')
        .select('source, expires_at')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .single();

      if (access) {
        setIsPremium(true);
        setSource(access.source);
        setExpiresAt(access.expires_at);
      } else {
        setIsPremium(false);
        setSource(null);
        setExpiresAt(null);
      }

      // Check for pending request
      const { data: pendingReq } = await supabase
        .from('premium_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .limit(1);

      setHasPendingRequest((pendingReq?.length ?? 0) > 0);
    } catch (err) {
      console.error('Error checking premium status:', err);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkPremium();
  }, [checkPremium]);

  const requestTrial = useCallback(async (message?: string): Promise<boolean> => {
    if (!userId) return false;

    const { error } = await supabase
      .from('premium_requests')
      .insert({
        user_id: userId,
        message: message || 'Requesting free trial access',
      });

    if (error) {
      console.error('Error requesting trial:', error);
      return false;
    }

    setHasPendingRequest(true);
    return true;
  }, [userId]);

  return {
    isPremium,
    loading,
    source,
    expiresAt,
    requestTrial,
    hasPendingRequest,
    refresh: checkPremium,
  };
};

/**
 * Premium feature names for gating
 */
export type PremiumFeature =
  | 'hints'
  | 'ai_analysis'
  | 'full_reports'
  | 'spaced_repetition'
  | 'unlimited_adaptive'
  | 'olympiad'
  | 'ad_free';
