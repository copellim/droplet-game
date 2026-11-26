/** Trigger a brief haptic pulse on devices that support the Vibration API. */
export function vibrate(ms = 30): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(ms);
  }
}

