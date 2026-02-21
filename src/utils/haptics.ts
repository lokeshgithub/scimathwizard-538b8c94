/**
 * Lightweight haptic feedback using the Vibration API.
 * Falls back silently on unsupported devices/browsers.
 */
export const haptics = {
  /** Light tap — nav buttons, toggles */
  light: () => {
    try { navigator.vibrate?.(10); } catch {}
  },
  /** Medium tap — quiz answer selection */
  medium: () => {
    try { navigator.vibrate?.(20); } catch {}
  },
  /** Success pattern — correct answer */
  success: () => {
    try { navigator.vibrate?.([15, 50, 15]); } catch {}
  },
  /** Error pattern — wrong answer */
  error: () => {
    try { navigator.vibrate?.([30, 30, 30]); } catch {}
  },
};
