import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Lock, FileText, Loader2, LogOut, UserPlus, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  uploadQuestionsFromCSV,
  parseCSVContent,
  parseExcelFile,
  fetchAllQuestionsForAdmin,
  exportQuestionBankToExcel,
  deleteAllQuestionData,
  parseTopicFromName,
  findBlueprintMatch,
  smartUploadQuestions,
  SmartUploadReport,
} from '@/services/questionService';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UsageDashboard } from '@/components/admin/UsageDashboard';
import { QuestionBankSummary } from '@/components/admin/QuestionBankSummary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [uploadMode, setUploadMode] = useState<'append' | 'replace' | 'smart'>('smart');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCleaningAll, setIsCleaningAll] = useState(false);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [uploadResults, setUploadResults] = useState<Array<{
    topic: string;
    normalizedTopic?: string;
    success: boolean;
    count?: number;
    skipped?: number;
    error?: string;
    blueprintMatch?: boolean;
  }>>([]);
  const [smartUploadReports, setSmartUploadReports] = useState<SmartUploadReport[]>([]);

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

    // Chemistry keywords - CHECK FIRST (more specific, avoids "physical" false positive)
    // "matter" is chemistry (states of matter, composition of matter)
    // "physical" alone could be physics, but "physical change" is chemistry
    if (/chemistry|chemical|acid|base|metal|atom|molecule|element|periodic|compound|reaction|carbon|fibre|matter|composition|mixture|solution|oxidation|reduction|ion|covalent|ionic|bonding|organic|inorganic|polymer|hydrocarbon|alkali|neutral|ph\b|corrosion|rust|combustion|electrolysis/i.test(lowerName)) {
      return 'Chemistry';
    }

    // Physics keywords - include variations
    if (/physics|physical|heat|motion|force|light|electric|magnet|sound|energy|gravit|optic|wave|velocity|acceleration|momentum|friction|pressure|density|buoyancy|current|voltage|resistance|circuit|lens|mirror|refraction|reflection/i.test(lowerName)) {
      return 'Physics';
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

  const handleCleanAllData = async () => {
    setIsCleaningAll(true);
    try {
      const result = await deleteAllQuestionData({ keepSubjects: false });
      
      if (result.success) {
        toast.success(
          `Cleaned database: ${result.deletedQuestions} questions, ${result.deletedTopics} topics, ${result.deletedSubjects} subjects deleted`
        );
        setUploadResults([]);
        setSummaryRefreshKey(prev => prev + 1);
      } else {
        toast.error(`Failed to clean data: ${result.error}`);
      }
    } catch (error) {
      toast.error('Failed to clean database');
      console.error(error);
    } finally {
      setIsCleaningAll(false);
    }
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadResults([]);
    setSmartUploadReports([]);
    const results: typeof uploadResults = [];
    const smartReports: SmartUploadReport[] = [];

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
            const rawSheetName = topicName || sheet.name || fileName;
            const { topic: parsedTopic } = parseTopicFromName(rawSheetName);
            const detectedSubject = detectSubjectFromName(rawSheetName) || subject;
            const blueprintMatch = findBlueprintMatch(parsedTopic, detectedSubject);

            if (uploadMode === 'smart') {
              // Use smart upload with change detection
              const report = await smartUploadQuestions(detectedSubject, rawSheetName, sheet.questions);
              smartReports.push(report);
              results.push({
                topic: `${fileName} → ${sheet.name}`,
                normalizedTopic: report.topicName,
                success: report.success,
                count: report.summary.inserted,
                skipped: report.summary.unchanged,
                error: report.error,
                blueprintMatch: blueprintMatch !== null,
              });
            } else {
              const result = await uploadQuestionsFromCSV(
                detectedSubject,
                rawSheetName,
                sheet.questions,
                { replaceExisting: uploadMode === 'replace' }
              );
              results.push({
                topic: `${fileName} → ${sheet.name}`,
                normalizedTopic: result.normalizedTopicName,
                success: result.success,
                count: result.count,
                skipped: result.skipped,
                error: result.error,
                blueprintMatch: blueprintMatch !== null,
              });
            }
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

        if (uploadMode === 'smart') {
          // Use smart upload with change detection
          const report = await smartUploadQuestions(detectedSubject, finalTopicName, questions);
          smartReports.push(report);
          results.push({
            topic: finalTopicName,
            normalizedTopic: report.topicName,
            success: report.success,
            count: report.summary.inserted,
            skipped: report.summary.unchanged,
            error: report.error,
          });
        } else {
          const result = await uploadQuestionsFromCSV(
            detectedSubject,
            finalTopicName,
            questions,
            { replaceExisting: uploadMode === 'replace' }
          );
          results.push({
            topic: finalTopicName,
            normalizedTopic: result.normalizedTopicName,
            success: result.success,
            count: result.count,
            skipped: result.skipped,
            error: result.error,
          });
        }
      }
    }

    setUploadResults(results);
    setSmartUploadReports(smartReports);
    setIsUploading(false);
    setTopicName('');
    event.target.value = '';

    // Show appropriate toast based on upload mode
    if (uploadMode === 'smart' && smartReports.length > 0) {
      const totalInserted = smartReports.reduce((acc, r) => acc + r.summary.inserted, 0);
      const totalUpdated = smartReports.reduce((acc, r) => acc + r.summary.updated, 0);
      const totalUnchanged = smartReports.reduce((acc, r) => acc + r.summary.unchanged, 0);

      let message = '';
      if (totalInserted > 0) message += `${totalInserted} new`;
      if (totalUpdated > 0) message += `${message ? ', ' : ''}${totalUpdated} updated`;
      if (totalUnchanged > 0) message += `${message ? ', ' : ''}${totalUnchanged} unchanged`;

      toast.success(`Smart upload: ${message || 'No changes'}`);
      setSummaryRefreshKey(prev => prev + 1);
    } else {
      const successCount = results.filter(r => r.success).length;
      const totalInserted = results.reduce((acc, r) => acc + (r.count || 0), 0);
      const totalSkipped = results.reduce((acc, r) => acc + (r.skipped || 0), 0);

      if (successCount > 0) {
        let message = `Uploaded ${totalInserted} question(s)`;
        if (totalSkipped > 0) {
          message += `, skipped ${totalSkipped} duplicate(s)`;
        }
        toast.success(message);
        setSummaryRefreshKey(prev => prev + 1);
      }
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
              <CardTitle>{isSignUp ? 'Create Admin Account' : 'Admin Login'}</CardTitle>
              <CardDescription>
                {isSignUp 
                  ? 'Create your admin account' 
                  : 'Sign in with your admin credentials'}
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

  // Authenticated but not admin - show access denied with option to request
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
                You don't have admin privileges yet.
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
                  onValueChange={(value) => setUploadMode(value as 'append' | 'replace' | 'smart')}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="smart" id="smart" />
                    <Label htmlFor="smart" className="cursor-pointer">
                      <span className="font-medium text-primary">Smart Update</span>
                      <span className="text-muted-foreground text-sm ml-1">(detect changes)</span>
                    </Label>
                  </div>
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
                      <span className="text-muted-foreground text-sm ml-1">(delete all first)</span>
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
                        {uploadMode === 'smart'
                          ? 'Detects changes and only updates modified questions - shows detailed report'
                          : uploadMode === 'append'
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadResults.map((result, index) => (
                  <motion.div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      result.success
                        ? result.blueprintMatch === false
                          ? 'bg-amber-100 dark:bg-amber-950/30 border border-amber-300'
                          : 'bg-primary/10'
                        : 'bg-destructive/10'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {result.success ? (
                      result.blueprintMatch === false ? (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {result.topic}
                        {result.normalizedTopic && result.normalizedTopic !== result.topic && (
                          <span className="text-primary ml-2 font-normal text-sm">
                            → {result.normalizedTopic}
                          </span>
                        )}
                        {result.blueprintMatch === false && (
                          <span className="text-amber-600 ml-2 font-normal text-xs">
                            ⚠️ Not in blueprint
                          </span>
                        )}
                      </p>
                      {result.success ? (
                        <p className="text-sm text-muted-foreground">
                          {uploadMode === 'smart' ? (
                            <>
                              {result.count || 0} new, {result.skipped || 0} unchanged
                            </>
                          ) : (
                            <>
                              {result.count} questions uploaded
                              {result.skipped && result.skipped > 0 && (
                                <span className="text-muted-foreground/70 ml-1">
                                  ({result.skipped} duplicates skipped)
                                </span>
                              )}
                            </>
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

        {/* Smart Upload Detailed Reports */}
        {smartUploadReports.length > 0 && smartUploadReports.some(r => r.updated.length > 0 || r.inserted.length > 0 || r.errors.length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detailed Change Report
              </CardTitle>
              <CardDescription>
                Smart upload detected the following changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {smartUploadReports.map((report, reportIndex) => (
                <div key={reportIndex} className="space-y-4">
                  {report.topicName && smartUploadReports.length > 1 && (
                    <h3 className="font-semibold text-lg border-b pb-2">{report.topicName}</h3>
                  )}

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{report.summary.total}</div>
                      <div className="text-muted-foreground">Total</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{report.summary.inserted}</div>
                      <div className="text-muted-foreground">New</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-amber-600">{report.summary.updated}</div>
                      <div className="text-muted-foreground">Updated</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-500">{report.summary.unchanged}</div>
                      <div className="text-muted-foreground">Unchanged</div>
                    </div>
                  </div>

                  {/* Updated Questions with Changes */}
                  {report.updated.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Updated Questions ({report.updated.length})
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {report.updated.map((item, idx) => (
                          <motion.div
                            key={idx}
                            className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-mono bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded">
                                Row {item.rowNumber}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                ID: {item.questionId.slice(0, 8)}...
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-2 line-clamp-2">{item.questionPreview}</p>
                            <div className="space-y-1">
                              {item.changes.map((change, changeIdx) => (
                                <div key={changeIdx} className="text-xs bg-white dark:bg-gray-900 rounded p-2">
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">{change.field}:</span>
                                  <div className="flex flex-col sm:flex-row gap-1 mt-1">
                                    <span className="text-red-600 dark:text-red-400 line-through">
                                      {change.oldValue || '(empty)'}
                                    </span>
                                    <span className="hidden sm:inline text-muted-foreground">→</span>
                                    <span className="text-green-600 dark:text-green-400">
                                      {change.newValue || '(empty)'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inserted Questions */}
                  {report.inserted.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        New Questions ({report.inserted.length})
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {report.inserted.map((item, idx) => (
                          <motion.div
                            key={idx}
                            className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-2 flex items-center gap-3"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <span className="text-xs font-mono bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded shrink-0">
                              Row {item.rowNumber}
                            </span>
                            <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded shrink-0">
                              L{item.level}
                            </span>
                            <span className="text-sm truncate">{item.questionPreview}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {report.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Errors ({report.errors.length})
                      </h4>
                      <div className="space-y-2">
                        {report.errors.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-2 flex items-center gap-3"
                          >
                            <span className="text-xs font-mono bg-red-200 dark:bg-red-800 px-2 py-0.5 rounded">
                              Row {item.rowNumber}
                            </span>
                            <span className="text-sm text-red-700 dark:text-red-400">{item.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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

        <Card className="mt-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Clean All Data
            </CardTitle>
            <CardDescription>
              Delete ALL questions, topics, and subjects for a fresh start. Use this before uploading a complete new question bank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isCleaningAll}
                  className="w-full sm:w-auto"
                >
                  {isCleaningAll ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cleaning database...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All Questions & Topics
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete ALL questions, topics, and subjects from the database. 
                    This action cannot be undone. Use this only if you want to start fresh with a new question bank.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <div className="mt-6">
          <QuestionBankSummary key={summaryRefreshKey} />
        </div>
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