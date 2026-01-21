import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database, RefreshCw, BookOpen, Layers } from 'lucide-react';

interface TopicSummary {
  subject: string;
  topic: string;
  questionCount: number;
}

interface SubjectSummary {
  name: string;
  topicCount: number;
  questionCount: number;
  topics: TopicSummary[];
}

export function QuestionBankSummary() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the efficient server-side RPC that counts questions per topic
      const { data, error: rpcError } = await supabase.rpc('get_question_summary');

      if (rpcError) throw rpcError;

      // Build summary from the RPC results
      const summaryMap = new Map<string, SubjectSummary>();

      for (const row of data || []) {
        if (!row.topic_name) continue; // Skip subjects with no topics
        
        let subject = summaryMap.get(row.subject_name);
        if (!subject) {
          subject = {
            name: row.subject_name,
            topicCount: 0,
            questionCount: 0,
            topics: [],
          };
          summaryMap.set(row.subject_name, subject);
        }

        subject.topics.push({
          subject: row.subject_name,
          topic: row.topic_name,
          questionCount: Number(row.question_count) || 0,
        });
        subject.topicCount++;
        subject.questionCount += Number(row.question_count) || 0;
      }

      // Sort topics within each subject
      for (const subject of summaryMap.values()) {
        subject.topics.sort((a, b) => a.topic.localeCompare(b.topic));
      }

      setSubjects(Array.from(summaryMap.values()).filter(s => s.topicCount > 0));
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Failed to fetch question bank summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalQuestions = subjects.reduce((acc, s) => acc + s.questionCount, 0);
  const totalTopics = subjects.reduce((acc, s) => acc + s.topicCount, 0);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Question Bank Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchSummary} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Question Bank Summary
            </CardTitle>
            <CardDescription>
              Overview of all questions in the database
            </CardDescription>
          </div>
          <Button onClick={fetchSummary} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-primary mb-1">
                  <Layers className="w-4 h-4" />
                  <span className="text-sm font-medium">Subjects</span>
                </div>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-primary mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Topics</span>
                </div>
                <p className="text-2xl font-bold">{totalTopics}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-primary mb-1">
                  <Database className="w-4 h-4" />
                  <span className="text-sm font-medium">Questions</span>
                </div>
                <p className="text-2xl font-bold">{totalQuestions.toLocaleString()}</p>
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold">By Subject</h3>
              {subjects.map((subject) => (
                <div key={subject.name} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSubject(
                      expandedSubject === subject.name ? null : subject.name
                    )}
                    className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({subject.topicCount} topics)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">
                        {subject.questionCount.toLocaleString()} questions
                      </span>
                      <span className="text-muted-foreground">
                        {expandedSubject === subject.name ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>
                  
                  {expandedSubject === subject.name && (
                    <div className="divide-y">
                      {subject.topics.map((topic) => (
                        <div
                          key={topic.topic}
                          className="flex items-center justify-between p-3 pl-6 text-sm"
                        >
                          <span>{topic.topic}</span>
                          <span className="text-muted-foreground">
                            {topic.questionCount} questions
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {subjects.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No questions in the database yet. Upload some questions to get started!
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
