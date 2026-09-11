/**
 * Driver Safety Audio & Voice Warning System for Hawk AI.
 * Plays high-frequency tactical alert tones and voice warnings
 * when approaching severe road defects or when live AI detects a pothole.
 */

let audioCtx: AudioContext | null = null;
let isAudioMuted = false;

export function setAudioMuted(muted: boolean) {
  isAudioMuted = muted;
}

export function getAudioMuted(): boolean {
  return isAudioMuted;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Tactical high-tech radar ping when defect is spotted.
 */
export function playTacticalPing(frequency = 880, duration = 0.18) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Audio contexts may be blocked before first user gesture
  }
}

/**
 * Driver safety voice warning using Web Speech API.
 */
export function speakDriverWarning(message: string) {
  if (isAudioMuted) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[AudioAlert] Speech synthesis unavailable:', err);
  }
}
