/**
 * Avatar customization options
 * Users can choose either a pre-made emoji avatar or initials with a color
 */

// Pre-made avatar options (10 fun options)
export const AVATAR_EMOJIS = [
  { id: 'wizard', emoji: '🧙', label: 'Wizard' },
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astronaut' },
  { id: 'scientist', emoji: '🧑‍🔬', label: 'Scientist' },
  { id: 'superhero', emoji: '🦸', label: 'Superhero' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
  { id: 'dragon', emoji: '🐲', label: 'Dragon' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'phoenix', emoji: '🔥', label: 'Phoenix' },
];

// Color options for initials-based avatars
export const AVATAR_COLORS = [
  { id: 'blue', gradient: 'from-blue-500 to-cyan-500', label: 'Ocean Blue' },
  { id: 'purple', gradient: 'from-purple-500 to-pink-500', label: 'Royal Purple' },
  { id: 'green', gradient: 'from-emerald-500 to-teal-500', label: 'Forest Green' },
  { id: 'orange', gradient: 'from-orange-500 to-amber-500', label: 'Sunset Orange' },
  { id: 'red', gradient: 'from-red-500 to-rose-500', label: 'Ruby Red' },
  { id: 'indigo', gradient: 'from-indigo-500 to-violet-500', label: 'Deep Indigo' },
  { id: 'pink', gradient: 'from-pink-500 to-fuchsia-500', label: 'Hot Pink' },
  { id: 'teal', gradient: 'from-teal-500 to-cyan-500', label: 'Tropical Teal' },
  { id: 'amber', gradient: 'from-amber-500 to-yellow-500', label: 'Golden Amber' },
  { id: 'slate', gradient: 'from-slate-600 to-slate-800', label: 'Midnight Slate' },
];

// Avatar preference type
export interface AvatarPreference {
  type: 'emoji' | 'initials';
  emojiId?: string;
  colorId?: string;
}

const AVATAR_STORAGE_KEY = 'user-avatar-preference';

// Get avatar preference from localStorage
export const getAvatarPreference = (userId: string): AvatarPreference => {
  try {
    const stored = localStorage.getItem(`${AVATAR_STORAGE_KEY}-${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load avatar preference:', e);
  }
  // Default to initials with blue color
  return { type: 'initials', colorId: 'blue' };
};

// Save avatar preference to localStorage
export const saveAvatarPreference = (userId: string, preference: AvatarPreference): void => {
  try {
    localStorage.setItem(`${AVATAR_STORAGE_KEY}-${userId}`, JSON.stringify(preference));
  } catch (e) {
    console.error('Failed to save avatar preference:', e);
  }
};

// Get initials from display name
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Get color gradient by ID
export const getColorGradient = (colorId: string): string => {
  const color = AVATAR_COLORS.find(c => c.id === colorId);
  return color?.gradient || AVATAR_COLORS[0].gradient;
};

// Get emoji by ID
export const getEmojiById = (emojiId: string): string => {
  const avatar = AVATAR_EMOJIS.find(a => a.id === emojiId);
  return avatar?.emoji || '👤';
};

// Generate a deterministic color based on user ID (for users who haven't customized)
export const getDefaultColorForUser = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index].id;
};
