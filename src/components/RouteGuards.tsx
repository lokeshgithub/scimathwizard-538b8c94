import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GuardProps {
  children: ReactNode;
}

/**
 * Redirects unauthenticated users to /auth.
 * Shows a spinner while the auth state is being determined.
 */
export const ProtectedRoute = ({ children }: GuardProps) => {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'authenticated' : 'unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

/**
 * Redirects non-admin users to /.
 * Checks the has_role RPC to verify admin status.
 */
export const AdminRoute = ({ children }: GuardProps) => {
  const [status, setStatus] = useState<'loading' | 'admin' | 'denied'>('loading');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('denied');
        return;
      }

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin',
      });

      if (error || data !== true) {
        setStatus('denied');
      } else {
        setStatus('admin');
      }
    };

    checkAdmin();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
