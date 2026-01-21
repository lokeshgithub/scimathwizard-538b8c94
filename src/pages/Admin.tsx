import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Lock, FileText, Loader2, LogOut, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { uploadQuestionsFromCSV, parseCSVContent } from '@/services/questionService';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Upload state
  const [subject, setSubject] = useState('Math');
  const [topicName, setTopicName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    topic: string;
    success: boolean;
    count?: number;
    error?: string;
  }>>([]);

  // Check admin role
  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
    return !!data;
  };

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check admin role after auth state change
        if (session?.user) {
          setTimeout(async () => {
            const isAdminUser = await checkAdminRole(session.user.id);
            setIsAdmin(isAdminUser);
            setIsLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminRole(session.user.id).then(isAdminUser => {
          setIsAdmin(isAdminUser);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully!');
    }
    setAuthLoading(false);
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! You can now sign in.');
      toast.info('Note: An admin must grant you admin privileges to upload questions.');
      setIsSignUp(false);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    toast.success('Signed out');
  };

  const detectSubjectFromName = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (/physics|heat|motion|light|electric/i.test(lowerName)) {
      return 'Physics';
    } else if (/chemistry|acid|chemical|fibre/i.test(lowerName)) {
      return 'Chemistry';
    }
    return 'Math';
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadResults([]);
    const results: typeof uploadResults = [];

    for (const file of Array.from(files)) {
      const content = await file.text();
      const fileName = file.name.replace('.csv', '');
      const detectedSubject = topicName ? subject : detectSubjectFromName(fileName);
      const finalTopicName = topicName || fileName;

      const questions = parseCSVContent(content);
      
      if (questions.length === 0) {
        results.push({
          topic: finalTopicName,
          success: false,
          error: 'No valid questions found in CSV',
        });
        continue;
      }

      const result = await uploadQuestionsFromCSV(detectedSubject, finalTopicName, questions);
      
      results.push({
        topic: finalTopicName,
        success: result.success,
        count: result.count,
        error: result.error,
      });
    }

    setUploadResults(results);
    setIsUploading(false);
    setTopicName('');
    event.target.value = '';

    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} topic(s)!`);
    }
  }, [subject, topicName]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - show login/signup
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <motion.div
                className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lock className="w-8 h-8 text-primary" />
              </motion.div>
              <CardTitle>{isSignUp ? 'Create Account' : 'Admin Login'}</CardTitle>
              <CardDescription>
                {isSignUp 
                  ? 'Create an account to request admin access' 
                  : 'Sign in with your admin account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (isSignUp ? handleSignUp() : handleSignIn())}
              />
              <Button 
                className="w-full" 
                onClick={isSignUp ? handleSignUp : handleSignIn}
                disabled={authLoading}
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : isSignUp ? (
                  <UserPlus className="w-4 h-4 mr-2" />
                ) : null}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Authenticated but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <motion.div
                className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit"
              >
                <AlertCircle className="w-8 h-8 text-destructive" />
              </motion.div>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have admin privileges. Contact an administrator to request access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Signed in as: {user.email}
              </p>
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <a 
                href="/" 
                className="block text-center text-primary hover:underline"
              >
                ← Back to Quiz App
              </a>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Authenticated admin - show upload interface
  return (
    <div className="min-h-screen bg-background">
      <motion.header 
        className="bg-gradient-magical text-white py-6 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">📚 Admin - Question Bank Manager</h1>
            <p className="text-white/80 text-sm mt-1">
              Signed in as: {user.email}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Question Bank
            </CardTitle>
            <CardDescription>
              Upload CSV files with questions. Each file will create a topic under the selected subject.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Math">Math</SelectItem>
                    <SelectItem value="Physics">Physics</SelectItem>
                    <SelectItem value="Chemistry">Chemistry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Topic Name (optional)</label>
                <Input
                  placeholder="Leave empty to use filename"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              </div>
            </div>

            <label className="block cursor-pointer">
              <input
                type="file"
                accept=".csv"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <motion.div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isUploading 
                    ? 'border-muted bg-muted/20' 
                    : 'border-border hover:border-primary hover:bg-primary/5'
                }`}
                whileHover={!isUploading ? { scale: 1.01 } : {}}
                whileTap={!isUploading ? { scale: 0.99 } : {}}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="font-medium">Uploading questions...</p>
                  </div>
                ) : (
                  <>
                    <motion.div 
                      className="inline-flex p-4 bg-primary/10 rounded-full mb-4"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <FileText className="w-8 h-8 text-primary" />
                    </motion.div>
                    <p className="font-semibold text-foreground mb-1">
                      Click to upload CSV files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Format: ID, Level, Question, A, B, C, D, Answer, Explanation
                    </p>
                  </>
                )}
              </motion.div>
            </label>
          </CardContent>
        </Card>

        {uploadResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadResults.map((result, index) => (
                  <motion.div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{result.topic}</p>
                      {result.success ? (
                        <p className="text-sm text-muted-foreground">
                          {result.count} questions uploaded
                        </p>
                      ) : (
                        <p className="text-sm text-destructive">{result.error}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="text-primary hover:underline"
          >
            ← Back to Quiz App
          </a>
        </div>
      </main>
    </div>
  );
};

export default Admin;