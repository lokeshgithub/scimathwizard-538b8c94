import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FriendWithProfile, FriendChallenge, SearchResult } from '@/types/friends';
import { toast } from 'sonner';

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendWithProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendWithProfile[]>([]);
  const [incomingChallenges, setIncomingChallenges] = useState<FriendChallenge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriendships = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Fetch all friendships where user is involved
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      // Get all unique user IDs we need profiles for
      const userIds = new Set<string>();
      friendships?.forEach(f => {
        if (f.requester_id !== user.id) userIds.add(f.requester_id);
        if (f.addressee_id !== user.id) userIds.add(f.addressee_id);
      });

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, total_stars, topics_mastered, current_streak, grade')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Process friendships
      const accepted: FriendWithProfile[] = [];
      const pending: FriendWithProfile[] = [];
      const sent: FriendWithProfile[] = [];

      friendships?.forEach(f => {
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const friendProfile = profileMap.get(friendId);
        
        if (!friendProfile) return;

        const friendWithProfile: FriendWithProfile = {
          ...f,
          status: f.status as 'pending' | 'accepted' | 'declined' | 'blocked',
          friend: friendProfile as any,
        };

        if (f.status === 'accepted') {
          accepted.push(friendWithProfile);
        } else if (f.status === 'pending') {
          if (f.addressee_id === user.id) {
            pending.push(friendWithProfile);
          } else {
            sent.push(friendWithProfile);
          }
        }
      });

      setFriends(accepted);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (error) {
      console.error('Error fetching friendships:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchIncomingChallenges = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('friend_challenges')
        .select('*')
        .eq('challenged_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;

      // Fetch challenger profiles
      const challengerIds = data?.map(c => c.challenger_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, total_stars, grade')
        .in('user_id', challengerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const challengesWithProfiles = data?.map(c => ({
        ...c,
        challenger: profileMap.get(c.challenger_id),
      })) || [];

      setIncomingChallenges(challengesWithProfiles as FriendChallenge[]);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  }, [user?.id]);

  // Search users by display name
  const searchUsers = async (query: string): Promise<SearchResult[]> => {
    if (!user?.id || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, total_stars, grade')
        .ilike('display_name', `%${query}%`)
        .neq('user_id', user.id)
        .limit(10);

      if (error) throw error;

      // Check existing friendship status for each result
      const results: SearchResult[] = [];
      for (const profile of data || []) {
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('status, requester_id')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},addressee_id.eq.${user.id})`)
          .single();

        let status: SearchResult['friendship_status'] = 'none';
        if (existingFriendship) {
          if (existingFriendship.status === 'accepted') {
            status = 'accepted';
          } else if (existingFriendship.status === 'pending') {
            status = existingFriendship.requester_id === user.id ? 'pending' : 'incoming';
          }
        }

        results.push({
          ...profile,
          friendship_status: status,
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  // Send friend request
  const sendFriendRequest = async (addresseeId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Friend request sent!');
      await fetchFriendships();
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Friend request already exists');
      } else {
        toast.error('Failed to send request');
      }
      return false;
    }
  };

  // Accept friend request
  const acceptRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Friend request accepted!');
      await fetchFriendships();
      return true;
    } catch (error) {
      toast.error('Failed to accept request');
      return false;
    }
  };

  // Decline friend request
  const declineRequest = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Request declined');
      await fetchFriendships();
      return true;
    } catch (error) {
      toast.error('Failed to decline request');
      return false;
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      toast.success('Friend removed');
      await fetchFriendships();
      return true;
    } catch (error) {
      toast.error('Failed to remove friend');
      return false;
    }
  };

  // Send challenge to friend
  const sendChallenge = async (
    friendId: string,
    subject: string,
    topic: string,
    roomCode?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('friend_challenges')
        .insert({
          challenger_id: user.id,
          challenged_id: friendId,
          subject,
          topic,
          room_code: roomCode,
        });

      if (error) throw error;

      toast.success('Challenge sent!');
      return true;
    } catch (error) {
      toast.error('Failed to send challenge');
      return false;
    }
  };

  // Accept challenge
  const acceptChallenge = async (challengeId: string): Promise<FriendChallenge | null> => {
    try {
      const { data, error } = await supabase
        .from('friend_challenges')
        .update({ status: 'accepted' })
        .eq('id', challengeId)
        .select()
        .single();

      if (error) throw error;

      await fetchIncomingChallenges();
      return data as FriendChallenge;
    } catch (error) {
      toast.error('Failed to accept challenge');
      return null;
    }
  };

  // Decline challenge
  const declineChallenge = async (challengeId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('friend_challenges')
        .update({ status: 'declined' })
        .eq('id', challengeId);

      if (error) throw error;

      await fetchIncomingChallenges();
      return true;
    } catch (error) {
      toast.error('Failed to decline challenge');
      return false;
    }
  };

  // Subscribe to realtime challenge updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friend-challenges')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_challenges',
          filter: `challenged_id=eq.${user.id}`,
        },
        () => {
          fetchIncomingChallenges();
          toast.info('New challenge received! 🎯');
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchIncomingChallenges]);

  // Initial fetch
  useEffect(() => {
    fetchFriendships();
    fetchIncomingChallenges();
  }, [fetchFriendships, fetchIncomingChallenges]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    incomingChallenges,
    loading,
    searchUsers,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    sendChallenge,
    acceptChallenge,
    declineChallenge,
    refresh: fetchFriendships,
  };
};
