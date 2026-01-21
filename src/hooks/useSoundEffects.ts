import { useCallback, useRef, useState, useEffect } from 'react';

// Sound URLs - using free, high-quality game sounds
const SOUNDS = {
  correct: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3', // Cheerful ding
  incorrect: 'https://cdn.pixabay.com/audio/2022/03/10/audio_40a55bb0ef.mp3', // Gentle wrong
  streak3: 'https://cdn.pixabay.com/audio/2022/03/15/audio_4e8d8f7c54.mp3', // Nice combo
  streak5: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3', // Power up
  levelUp: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d0c6b8b0cc.mp3', // Level complete
  achievement: 'https://cdn.pixabay.com/audio/2022/03/15/audio_4e8d8f7c54.mp3', // Achievement unlock
  click: 'https://cdn.pixabay.com/audio/2022/03/10/audio_40a55bb0ef.mp3', // UI click
} as const;

type SoundType = keyof typeof SOUNDS;

const STORAGE_KEY = 'quiz-sound-enabled';

export const useSoundEffects = () => {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  
  const audioCache = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const lastPlayTime = useRef<Map<SoundType, number>>(new Map());

  // Preload sounds
  useEffect(() => {
    if (!enabled) return;
    
    Object.entries(SOUNDS).forEach(([key, url]) => {
      if (!audioCache.current.has(key as SoundType)) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = 0.5;
        audioCache.current.set(key as SoundType, audio);
      }
    });
  }, [enabled]);

  const play = useCallback((sound: SoundType) => {
    if (!enabled) return;

    // Debounce - prevent same sound playing too quickly
    const now = Date.now();
    const lastTime = lastPlayTime.current.get(sound) || 0;
    if (now - lastTime < 100) return;
    lastPlayTime.current.set(sound, now);

    try {
      let audio = audioCache.current.get(sound);
      
      if (!audio) {
        audio = new Audio(SOUNDS[sound]);
        audio.volume = 0.5;
        audioCache.current.set(sound, audio);
      }

      // Clone for overlapping plays
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = sound === 'levelUp' || sound === 'achievement' ? 0.6 : 0.4;
      
      clone.play().catch(() => {
        // Silently fail if autoplay is blocked
      });
    } catch (e) {
      // Silently fail
    }
  }, [enabled]);

  const toggleSound = useCallback(() => {
    setEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  return {
    enabled,
    toggleSound,
    playCorrect: useCallback(() => play('correct'), [play]),
    playIncorrect: useCallback(() => play('incorrect'), [play]),
    playStreak: useCallback((count: number) => {
      if (count >= 5) play('streak5');
      else if (count >= 3) play('streak3');
    }, [play]),
    playLevelUp: useCallback(() => play('levelUp'), [play]),
    playAchievement: useCallback(() => play('achievement'), [play]),
    playClick: useCallback(() => play('click'), [play]),
  };
};
