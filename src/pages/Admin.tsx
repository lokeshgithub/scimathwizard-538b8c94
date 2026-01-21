import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Lock, FileText, Loader2, LogOut, UserPlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { uploadQuestionsFromCSV, parseCSVContent, parseExcelFile, fetchAllQuestionsForAdmin, exportQuestionBankToExcel } from '@/services/questionService';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UsageDashboard } from '@/components/admin/UsageDashboard';

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
  const [uploadMode, setUploadMode] = useState<'append' | 'replace'>('append');
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    topic: string;
    success: boolean;
    count?: number;
    skipped?: number;
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

  const handleDownloadQuestionBank = async () => {
    setIsDownloading(true);
    try {
      const data = await fetchAllQuestionsForAdmin();
      
      if (data.subjects.length === 0) {
        toast.error('No questions found in the database');
        return;
      }

      const blob = exportQuestionBankToExcel(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `question-bank-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalQuestions = data.subjects.reduce(
        (acc, s) => acc + s.topics.reduce((t, topic) => t + topic.questions.length, 0),
        0
      );
      toast.success(`Downloaded ${totalQuestions} questions across ${data.subjects.length} subject(s)`);
    } catch (error) {
      toast.error('Failed to download question bank');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadResults([]);
    const results: typeof uploadResults = [];

    for (const file of Array.from(files)) {
      const fileName = file.name.replace(/\.(csv|tsv|txt|xlsx|xls)$/i, '');
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      
      if (isExcel) {
        try {
          const buffer = await file.arrayBuffer();
          const sheets = parseExcelFile(buffer);
          
          if (sheets.length === 0) {
            results.push({
              topic: fileName,
              success: false,
              error: 'No valid questions found in Excel file',
            });
            continue;
          }
          
          for (const sheet of sheets) {
            const sheetTopicName = topicName || sheet.name || fileName;
            const detectedSubject = detectSubjectFromName(sheetTopicName) || subject;
            
            const result = await uploadQuestionsFromCSV(
              detectedSubject, 
              sheetTopicName, 
              sheet.questions,
              { replaceExisting: uploadMode === 'replace' }
            );
            
            results.push({
              topic: `${fileName} → ${sheet.name}`,
              success: result.success,
              count: result.count,
              skipped: result.skipped,
              error: result.error,
            });
          }
        } catch (error) {
          results.push({
            topic: fileName,
            success: false,
            error: `Excel parsing error: ${(error as Error).message}`,
          });
        }
      } else {
        const content = await file.text();
        const detectedSubject = topicName ? subject : detectSubjectFromName(fileName);
        const finalTopicName = topicName || fileName;

        const questions = parseCSVContent(content);
        
        if (questions.length === 0) {
          results.push({
            topic: finalTopicName,
            success: false,
            error: 'No valid questions found in file',
          });
          continue;
        }

        const result = await uploadQuestionsFromCSV(
          detectedSubject, 
          finalTopicName, 
          questions,
          { replaceExisting: uploadMode === 'replace' }
        );
        
        results.push({
          topic: finalTopicName,
          success: result.success,
          count: result.count,
          skipped: result.skipped,
          error: result.error,
        });
      }
    }

    setUploadResults(results);
    setIsUploading(false);
    setTopicName('');
    event.target.value = '';

    const successCount = results.filter(r => r.success).length;
    const totalInserted = results.reduce((acc, r) => acc + (r.count || 0), 0);
    const totalSkipped = results.reduce((acc, r) => acc + (r.skipped || 0), 0);
    
    if (successCount > 0) {
      let message = `Uploaded ${totalInserted} question(s)`;
      if (totalSkipped > 0) {
        message += `, skipped ${totalSkipped} duplicate(s)`;
      }
      toast.success(message);
    }
  }, [subject, topicName, uploadMode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show upload interface directly (no auth required)
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
              Upload and manage quiz questions
            </p>
          </div>
          <a href="/">
            <Button variant="secondary" size="sm">
              ← Back to Quiz
            </Button>
          </a>
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
              Upload CSV, TSV, or Excel files with questions. Excel files with multiple sheets will create one topic per sheet.
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

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-3 block">Upload Mode</label>
                <RadioGroup
                  value={uploadMode}
                  onValueChange={(value) => setUploadMode(value as 'append' | 'replace')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="append" id="append" />
                    <Label htmlFor="append" className="cursor-pointer">
                      <span className="font-medium">Append</span>
                      <span className="text-muted-foreground text-sm ml-1">(skip duplicates)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="cursor-pointer">
                      <span className="font-medium">Replace</span>
                      <span className="text-muted-foreground text-sm ml-1">(delete existing first)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls"
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
                        Click to upload question files
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports: CSV, TSV, Excel (.xlsx, .xls)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadMode === 'append' 
                          ? 'Duplicate questions will be automatically skipped'
                          : 'All existing questions in the topic will be deleted first'}
                      </p>
                    </>
                  )}
                </motion.div>
              </label>
            </div>
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
                      result.success ? 'bg-primary/10' : 'bg-destructive/10'
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
                          {result.skipped && result.skipped > 0 && (
                            <span className="text-muted-foreground/70 ml-1">
                              ({result.skipped} duplicates skipped)
                            </span>
                          )}
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Question Bank
            </CardTitle>
            <CardDescription>
              Download all questions as an Excel file with each topic on a separate sheet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDownloadQuestionBank}
              disabled={isDownloading}
              className="w-full sm:w-auto"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing download...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download All Questions (.xlsx)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6">
          <UsageDashboard />
        </div>

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