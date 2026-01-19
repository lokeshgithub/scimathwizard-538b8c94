import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Lock, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { uploadQuestionsFromCSV, parseCSVContent } from '@/services/questionService';

const ADMIN_PASSWORD = 'masteryquiz2024'; // Simple password protection

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [subject, setSubject] = useState('Math');
  const [topicName, setTopicName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{
    topic: string;
    success: boolean;
    count?: number;
    error?: string;
  }>>([]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast.success('Welcome, Admin!');
    } else {
      toast.error('Incorrect password');
    }
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

  if (!isAuthenticated) {
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
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>Enter password to manage question banks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button className="w-full" onClick={handleLogin}>
                Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.header 
        className="bg-gradient-magical text-white py-6 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold">📚 Admin - Question Bank Manager</h1>
          <p className="text-white/80 text-sm mt-2">
            Upload CSV files to make questions available to all users
          </p>
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
