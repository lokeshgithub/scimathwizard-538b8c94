import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { initFunElementTracking } from '@/services/funElementTrackingService';
import { initFunElementCache } from '@/data/funElements';
interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_stars: number;
  topics_mastered: number;
  questions_answered: number;
  current_streak: number;
  longest_streak: number;
  grade: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if user has admin role
  const checkAdminRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' });
    
    if (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
      return false;
    }
    
    setIsAdmin(data === true);
    return data === true;
  }, []);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }
    
    setProfile(data);
    return data;
  }, []);

  // Create profile if it doesn't exist
  const createProfile = useCallback(async (userId: string, displayName: string, grade: number = 7) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
        grade,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    setProfile(data);
    return data;
  }, []);

  // Update profile grade
  const updateGrade = useCallback(async (grade: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ grade })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating grade:', error);
    } else {
      setProfile(prev => prev ? { ...prev, grade } : null);
      toast({
        title: 'Grade updated! 🎓',
        description: `You're now in Class ${grade}`,
      });
    }
  }, [user, toast]);

  // Update profile stats
  // Returns the new profile data after successful update
  const updateStats = useCallback(async (stats: {
    total_stars?: number;
    topics_mastered?: number;
    questions_answered?: number;
    current_streak?: number;
    longest_streak?: number;
  }): Promise<Profile | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .update(stats)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating stats:', error);
      return null;
    }

    // Update local state with the ACTUAL database response
    // This ensures we have the real value, not a stale optimistic update
    if (data) {
      setProfile(data);
    }

    return data;
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer profile fetch, admin check, and fun element tracking with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            checkAdminRole(session.user.id);
            // Initialize fun element tracking for logged-in user
            initFunElementTracking(session.user.id).then(() => {
              initFunElementCache();
            });
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          // Initialize fun element tracking for guest (localStorage)
          initFunElementTracking(null).then(() => {
            initFunElementCache();
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id);
        checkAdminRole(session.user.id);
        // Initialize fun element tracking for logged-in user
        initFunElementTracking(session.user.id).then(() => {
          initFunElementCache();
        });
      } else {
        // Initialize fun element tracking for guest
        initFunElementTracking(null).then(() => {
          initFunElementCache();
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, checkAdminRole]);

  const signUp = async (email: string, password: string, displayName: string, grade: number = 7) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    // Clear any previous guest progress for new accounts
    localStorage.removeItem('magical-mastery-quiz');
    localStorage.removeItem('quiz-seen-fun-elements');

    // Create profile for new user with grade
    if (data.user) {
      await createProfile(data.user.id, displayName, grade);
    }

    toast({
      title: 'Welcome! 🎉',
      description: `Account created for Class ${grade}!`,
    });

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({
      title: 'Welcome back! 👋',
      description: 'Signed in successfully!',
    });

    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setProfile(null);
      toast({
        title: 'Signed out',
        description: 'See you next time! 👋',
      });
    }
  };

  return {
    user,
    session,
    profile,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
    updateStats,
    updateGrade,
    fetchProfile,
    createProfile,
  };
};
