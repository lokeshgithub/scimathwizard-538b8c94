import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, X, Clock, Loader2, UserCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PremiumRequest {
  id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  trial_days: number | null;
  profile?: {
    display_name: string;
    grade: number | null;
    questions_answered: number;
  } | null;
}

interface ActiveAccess {
  id: string;
  user_id: string;
  source: string;
  starts_at: string;
  expires_at: string;
  profile?: {
    display_name: string;
  } | null;
}

export const PremiumManagement = () => {
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [activeAccess, setActiveAccess] = useState<ActiveAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [trialDays, setTrialDays] = useState<Record<string, number>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  // Manual grant state
  const [grantEmail, setGrantEmail] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [granting, setGranting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending requests
      const { data: reqData } = await supabase
        .from('premium_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch active premium access
      const { data: accessData } = await supabase
        .from('premium_access')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      // Fetch profiles for all user_ids
      const allUserIds = [
        ...(reqData || []).map(r => r.user_id),
        ...(accessData || []).map(a => a.user_id),
      ];
      const uniqueUserIds = [...new Set(allUserIds)];

      let profiles: Record<string, { display_name: string; grade: number | null; questions_answered: number }> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, grade, questions_answered')
          .in('user_id', uniqueUserIds);

        if (profileData) {
          profiles = Object.fromEntries(profileData.map(p => [p.user_id, p]));
        }
      }

      setRequests((reqData || []).map(r => ({ ...r, profile: profiles[r.user_id] || null })));
      setActiveAccess((accessData || []).map(a => ({ ...a, profile: profiles[a.user_id] || null })));
    } catch (err) {
      console.error('Error fetching premium data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (requestId: string, userId: string) => {
    const days = trialDays[requestId] || 14;
    const notes = adminNotes[requestId] || '';
    setProcessing(requestId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Create premium access
      const { error: accessError } = await supabase
        .from('premium_access')
        .insert({
          user_id: userId,
          granted_by: user?.id,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          source: 'trial',
        });

      if (accessError) throw accessError;

      // Update request status
      const { error: reqError } = await supabase
        .from('premium_requests')
        .update({
          status: 'approved',
          trial_days: days,
          admin_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      toast.success(`Approved ${days}-day trial!`);
      fetchData();
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const notes = adminNotes[requestId] || '';
    setProcessing(requestId);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('premium_requests')
        .update({
          status: 'rejected',
          admin_notes: notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const handleManualGrant = async () => {
    if (!grantEmail.trim()) {
      toast.error('Enter a user email');
      return;
    }
    setGranting(true);

    try {
      // Find profile by looking up user email via profiles (we need to search)
      // Since we can't query auth.users, find profile by display_name or email pattern
      // Better approach: admin enters user_id or we search profiles
      const { data: profileMatch } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .ilike('display_name', `%${grantEmail.trim()}%`)
        .limit(5);

      if (!profileMatch || profileMatch.length === 0) {
        toast.error('No user found with that name. Try exact display name.');
        setGranting(false);
        return;
      }

      if (profileMatch.length > 1) {
        toast.error(`Multiple matches: ${profileMatch.map(p => p.display_name).join(', ')}. Be more specific.`);
        setGranting(false);
        return;
      }

      const targetUserId = profileMatch[0].user_id;
      const { data: { user } } = await supabase.auth.getUser();
      const days = parseInt(grantDays) || 30;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('premium_access')
        .insert({
          user_id: targetUserId,
          granted_by: user?.id,
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          source: 'admin_grant',
        });

      if (error) throw error;

      toast.success(`Granted ${days}-day premium to ${profileMatch[0].display_name}`);
      setGrantEmail('');
      fetchData();
    } catch (err) {
      console.error('Error granting premium:', err);
      toast.error('Failed to grant premium access');
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('premium_access')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', accessId);

      if (error) throw error;
      toast.success('Access revoked');
      fetchData();
    } catch (err) {
      toast.error('Failed to revoke access');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Manual Grant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Grant Premium Access
          </CardTitle>
          <CardDescription>Manually grant premium to a user by their display name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="User display name"
              value={grantEmail}
              onChange={e => setGrantEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={grantDays} onValueChange={setGrantDays}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleManualGrant} disabled={granting}>
              {granting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
              Grant
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Trial Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(req => (
                <motion.div
                  key={req.id}
                  className="p-4 rounded-xl border border-border bg-muted/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {req.profile?.display_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Class {req.profile?.grade || '?'} · {req.profile?.questions_answered || 0} questions answered
                      </p>
                      {req.message && (
                        <p className="text-sm text-muted-foreground mt-1 italic">"{req.message}"</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1 flex gap-2">
                      <Select
                        value={String(trialDays[req.id] || 14)}
                        onValueChange={v => setTrialDays(prev => ({ ...prev, [req.id]: parseInt(v) }))}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Admin notes (optional)"
                        value={adminNotes[req.id] || ''}
                        onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.id, req.user_id)}
                        disabled={processing === req.id}
                      >
                        {processing === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(req.id)}
                        disabled={processing === req.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Premium Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Active Premium Users ({activeAccess.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAccess.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active premium users</p>
          ) : (
            <div className="space-y-2">
              {activeAccess.map(access => {
                const daysLeft = Math.ceil(
                  (new Date(access.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={access.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="font-medium text-foreground">
                        {access.profile?.display_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {access.source} · {daysLeft} days left · Expires {new Date(access.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRevokeAccess(access.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reviews */}
      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Reviews ({reviewedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewedRequests.slice(0, 10).map(req => (
                <div key={req.id} className="flex items-center justify-between p-2 text-sm">
                  <span>{req.profile?.display_name || 'Unknown'}</span>
                  <span className={req.status === 'approved' ? 'text-green-600' : 'text-red-500'}>
                    {req.status === 'approved' ? `✓ Approved (${req.trial_days}d)` : '✗ Rejected'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
