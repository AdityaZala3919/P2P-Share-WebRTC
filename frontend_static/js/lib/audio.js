/**
 * Web Audio API synthesized sci-fi sound effects and haptics.
 */
const AUDIO_KEY = "ciphershare_audio_enabled";

export function isAudioEnabled() {
  return localStorage.getItem(AUDIO_KEY) !== "false";
}

export function toggleAudio() {
  const current = isAudioEnabled();
  localStorage.setItem(AUDIO_KEY, String(!current));
  return !current;
}

function playTone(freq, duration, type = "sine", volume = 0.1) {
  if (!isAudioEnabled()) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration * 0.5);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
  } catch (e) {
    // Ignore audio context autoplay limitations
  }
}

export const playChime = () => playTone(880, 0.15, "sine", 0.08);
export const playConnected = () => { playTone(660, 0.1); setTimeout(() => playTone(880, 0.15), 120); };
export const playMessage = () => playTone(1200, 0.08, "sine", 0.05);
export const playTransferComplete = () => { playTone(800, 0.1); setTimeout(() => playTone(1000, 0.1), 120); setTimeout(() => playTone(1200, 0.2), 240); };
export const playError = () => playTone(300, 0.3, "sawtooth", 0.06);

export function haptic(pattern = 50) {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}