import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, Trophy, Brain, Users, BarChart3, Star, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Brain, title: 'Unlimited Practice', desc: 'Never run out of questions across 25+ topics' },
  { icon: Zap, title: 'AI-Powered Analysis', desc: 'Get personalized feedback after every session' },
  { icon: Trophy, title: 'Adaptive Challenges', desc: 'Difficulty adjusts to your skill level in real-time' },
  { icon: Users, title: 'Battle Friends', desc: 'Challenge classmates to live quiz battles' },
  { icon: BarChart3, title: 'Detailed Reports', desc: 'Track progress with exportable PDF reports' },
  { icon: Star, title: 'Gamified Learning', desc: 'Earn stars, unlock achievements, climb leaderboards' },
];

const socialProof = [
  { metric: '∞', label: 'Questions' },
  { metric: '25+', label: 'Topics' },
  { metric: '6', label: 'Mastery Levels' },
  { metric: '100%', label: 'Free' },
];

const subjects = ['Integers', 'Fractions', 'Exponents', 'Algebra', 'Geometry', 'Probability', 'Mensuration', 'Data Handling'];

interface LandingHeroProps {
  onGetStarted: () => void;
}

export function LandingHero({ onGetStarted }: LandingHeroProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10 pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4" />
              Start free — Upgrade to Premium for AI coaching & more
            </motion.div>

            {/* H1 Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              Master Maths &amp; Science
              <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-magical)' }}>
                Like a Wizard ✨
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              The adaptive quiz platform built for Class 7+ students preparing for
              <strong className="text-foreground"> IIT Foundation, Olympiads &amp; NTSE</strong>.
              Unlimited practice questions. 6 difficulty levels. AI-powered coaching.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <Button
                size="lg"
                className="text-lg px-8 py-6 rounded-xl shadow-lg"
                onClick={onGetStarted}
              >
                Start Practicing Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-xl"
                asChild
              >
                <Link to="/adaptive">Try Adaptive Challenge</Link>
              </Button>
            </div>

            {/* Social Proof Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
              {socialProof.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{item.metric}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Topics Marquee */}
      <section className="py-6 bg-muted/50 overflow-hidden">
        <div className="flex animate-marquee gap-4 whitespace-nowrap">
          {[...subjects, ...subjects].map((topic, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-card text-foreground text-sm font-medium shadow-sm border border-border">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              {topic}
            </span>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            Everything You Need to Excel
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Built by educators. Powered by AI. Designed for students who want to go beyond textbooks.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            How It Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Pick a Topic', desc: 'Choose from topics across Maths, Physics, and Chemistry', emoji: '📚' },
              { step: '2', title: 'Practice & Level Up', desc: 'Answer 10 questions per level. Hit the accuracy target (100% → 70% as levels increase) to advance', emoji: '🎯' },
              { step: '3', title: 'Track & Improve', desc: 'Get AI-powered analysis, spaced repetition reminders, and detailed reports', emoji: '📊' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="text-4xl mb-3">{item.emoji}</div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            Ready to Start Your Journey?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join students who are already mastering maths and science — no signup required to get started.
          </p>
          <Button
            size="lg"
            className="text-lg px-10 py-6 rounded-xl shadow-lg"
            onClick={onGetStarted}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Practicing Now
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Free forever • No ads • Works offline
          </p>
        </motion.div>
      </section>
    </div>
  );
}
