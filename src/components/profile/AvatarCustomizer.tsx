import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Palette, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AVATAR_EMOJIS,
  AVATAR_COLORS,
  AvatarPreference,
  getAvatarPreference,
  saveAvatarPreference,
  getInitials,
} from '@/data/avatarOptions';

interface AvatarCustomizerProps {
  userId: string;
  displayName: string;
  onSave?: () => void;
}

export const AvatarCustomizer = ({ userId, displayName, onSave }: AvatarCustomizerProps) => {
  const [preference, setPreference] = useState<AvatarPreference>({ type: 'initials', colorId: 'blue' });
  const [activeTab, setActiveTab] = useState<'emoji' | 'initials'>('initials');

  // Load saved preference
  useEffect(() => {
    const saved = getAvatarPreference(userId);
    setPreference(saved);
    setActiveTab(saved.type);
  }, [userId]);

  const handleSelectEmoji = (emojiId: string) => {
    const newPref: AvatarPreference = { type: 'emoji', emojiId };
    setPreference(newPref);
    saveAvatarPreference(userId, newPref);
    onSave?.();
  };

  const handleSelectColor = (colorId: string) => {
    const newPref: AvatarPreference = { type: 'initials', colorId };
    setPreference(newPref);
    saveAvatarPreference(userId, newPref);
    onSave?.();
  };

  const initials = getInitials(displayName);

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setActiveTab('emoji')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'emoji'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smile className="w-4 h-4" />
          Choose Avatar
        </button>
        <button
          onClick={() => setActiveTab('initials')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'initials'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-4 h-4" />
          Use Initials
        </button>
      </div>

      {/* Emoji Selection */}
      {activeTab === 'emoji' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">Choose your favorite avatar:</p>
          <div className="grid grid-cols-5 gap-3">
            {AVATAR_EMOJIS.map((avatar) => {
              const isSelected = preference.type === 'emoji' && preference.emojiId === avatar.id;
              return (
                <motion.button
                  key={avatar.id}
                  onClick={() => handleSelectEmoji(avatar.id)}
                  className={`relative p-3 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-3xl">{avatar.emoji}</span>
                  <p className="text-xs text-muted-foreground mt-1">{avatar.label}</p>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Initials with Color Selection */}
      {activeTab === 'initials' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Your initials: <strong className="text-foreground">{initials}</strong> — Choose a color:
          </p>
          <div className="grid grid-cols-5 gap-3">
            {AVATAR_COLORS.map((color) => {
              const isSelected = preference.type === 'initials' && preference.colorId === color.id;
              return (
                <motion.button
                  key={color.id}
                  onClick={() => handleSelectColor(color.id)}
                  className={`relative p-2 rounded-xl transition-all ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={color.label}
                >
                  <div
                    className={`w-12 h-12 mx-auto rounded-full bg-gradient-to-br ${color.gradient} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                  >
                    {initials}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{color.label}</p>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Preview */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
        <span className="text-sm text-muted-foreground">Preview:</span>
        {preference.type === 'emoji' && preference.emojiId ? (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-3xl shadow-md">
            {AVATAR_EMOJIS.find(a => a.id === preference.emojiId)?.emoji || '👤'}
          </div>
        ) : (
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${
              AVATAR_COLORS.find(c => c.id === preference.colorId)?.gradient || AVATAR_COLORS[0].gradient
            } flex items-center justify-center text-white font-bold text-lg shadow-md`}
          >
            {initials}
          </div>
        )}
        <div>
          <p className="font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {preference.type === 'emoji'
              ? AVATAR_EMOJIS.find(a => a.id === preference.emojiId)?.label || 'Avatar'
              : AVATAR_COLORS.find(c => c.id === preference.colorId)?.label || 'Color'
            }
          </p>
        </div>
      </div>
    </div>
  );
};
