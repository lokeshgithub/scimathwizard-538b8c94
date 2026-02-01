import { useMemo } from 'react';
import {
  AvatarPreference,
  getAvatarPreference,
  getInitials,
  getColorGradient,
  getEmojiById,
  getDefaultColorForUser,
} from '@/data/avatarOptions';

interface UserAvatarProps {
  userId: string;
  displayName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

export const UserAvatar = ({ userId, displayName, size = 'md', className = '' }: UserAvatarProps) => {
  const preference = useMemo(() => {
    const pref = getAvatarPreference(userId);
    // If no color set, use deterministic color based on user ID
    if (pref.type === 'initials' && !pref.colorId) {
      pref.colorId = getDefaultColorForUser(userId);
    }
    return pref;
  }, [userId]);

  const sizeClass = sizeClasses[size];

  if (preference.type === 'emoji' && preference.emojiId) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center ${className}`}
      >
        <span className={size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-4xl'}>
          {getEmojiById(preference.emojiId)}
        </span>
      </div>
    );
  }

  // Initials with color gradient
  const gradient = getColorGradient(preference.colorId || getDefaultColorForUser(userId));
  const initials = getInitials(displayName);

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-md ${className}`}
    >
      {initials}
    </div>
  );
};
