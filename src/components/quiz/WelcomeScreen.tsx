import { motion } from 'framer-motion';
import { Wand2, Sparkles, BookOpen } from 'lucide-react';

export const WelcomeScreen = () => {
  return (
    <motion.div 
      className="bg-card rounded-2xl shadow-card p-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        className="inline-block mb-6"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="relative">
          <Wand2 className="w-16 h-16 text-primary" />
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-accent" />
          </motion.div>
        </div>
      </motion.div>
      
      <h2 className="text-2xl font-bold text-gradient-magical mb-4">
        Welcome to Magic Mastery Quiz! ✨
      </h2>
      
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        Embark on a magical learning adventure with your favorite characters!
      </p>

      <div className="grid gap-4 max-w-lg mx-auto text-left">
        {[
          { step: '1', text: '📚 Choose a subject from the tabs above', color: 'from-blue-400 to-cyan-400' },
          { step: '2', text: '🎯 Select a topic to start practicing', color: 'from-purple-400 to-pink-400' },
          { step: '3', text: '✅ Answer questions and get 80% to level up!', color: 'from-orange-400 to-red-400' },
          { step: '4', text: '⭐ Master all 5 levels to complete a topic!', color: 'from-yellow-400 to-orange-400' },
        ].map((item, index) => (
          <motion.div
            key={item.step}
            className="flex items-center gap-4 p-3 bg-muted rounded-xl"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold`}>
              {item.step}
            </div>
            <p className="text-foreground">{item.text}</p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <span className="font-medium">Each level has different magical friends to help you!</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          🐱 Doraemon (L1) → ⚡ Pokémon (L2) → 🧙 Harry Potter (L3-5)
        </p>
      </motion.div>
    </motion.div>
  );
};
