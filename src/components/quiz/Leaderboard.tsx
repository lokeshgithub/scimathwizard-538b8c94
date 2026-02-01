import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Medal, Crown, ChevronRight, X, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_stars: number;
  topics_mastered: number;
  current_streak: number;
  rank?: number;
}

interface LeaderboardProps {
  currentUserId?: string;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500/30" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
  }
};

const getRankBg = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    case 2:
      return 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-400/30';
    case 3:
      return 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30';
    default:
      return 'bg-card border-border';
  }
};

export const Leaderboard = ({ currentUserId }: LeaderboardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, total_stars, topics_mastered, current_streak, user_id')
      .order('total_stars', { ascending: false })
      .order('created_at', { ascending: true }) // Secondary sort: earlier users rank higher for ties
      .limit(50);

    if (error) {
      console.error('Error fetching leaderboard:', error);
    } else if (data) {
      // Calculate true ranks accounting for ties
      let currentRank = 1;
      const rankedData = data.map((entry: any, index: number) => {
        if (index > 0 && entry.total_stars < data[index - 1].total_stars) {
          currentRank = index + 1;
        }
        return { ...entry, rank: currentRank };
      });
      
      setEntries(rankedData);
      
      // Find current user's rank (use the calculated rank, not position)
      if (currentUserId) {
        const userEntry = rankedData.find((e: any) => e.user_id === currentUserId);
        setUserRank(userEntry ? userEntry.rank : null);
      }
    }

    setLoading(false);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-4 left-4 z-40"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 shadow-lg"
          aria-label="Open leaderboard"
        >
          <Trophy className="w-6 h-6 text-white" />
        </Button>
      </motion.div>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal Content */}
            <motion.div
              className="relative w-full max-w-md max-h-[80vh] bg-card rounded-2xl shadow-xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Leaderboard</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-sm text-white/80 mt-1">
                  Top students ranked by stars earned ⭐
                </p>
              </div>

              {/* User Rank Banner */}
              {userRank && (
                <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Rank</span>
                  <span className="font-bold text-primary">#{userRank}</span>
                </div>
              )}

              {/* Entries List */}
              <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No students yet!</p>
                    <p className="text-sm">Be the first to join!</p>
                  </div>
                ) : (
                  entries.map((entry, index) => {
                    const rank = entry.rank ?? index + 1;
                    const isCurrentUser = currentUserId && entries[index] && (entries[index] as any).user_id === currentUserId;

                    return (
                      <motion.div
                        key={entry.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-xl border
                          ${getRankBg(rank)}
                          ${isCurrentUser ? 'ring-2 ring-primary' : ''}
                        `}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* Rank */}
                        <div className="w-8 flex items-center justify-center">
                          {getRankIcon(rank)}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-magical flex items-center justify-center text-white font-bold text-lg">
                          {entry.display_name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {entry.display_name}
                            {isCurrentUser && (
                              <span className="text-xs text-primary ml-1">(You)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>🏆 {entry.topics_mastered} mastered</span>
                            {entry.current_streak > 0 && (
                              <span>🔥 {entry.current_streak} day streak</span>
                            )}
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1 font-bold text-amber-500">
                          <Star className="w-4 h-4 fill-amber-500" />
                          {entry.total_stars.toLocaleString()}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Keep practicing to climb the ranks! 🚀
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
