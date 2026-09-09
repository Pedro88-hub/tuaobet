export type CrashSoundName = 'bet' | 'cashout' | 'cancel' | 'crash';

const VOLUME = 0.35;
/** Duração máxima por som (ms). Sem entrada = toca até ao fim. */
const MAX_DURATION_MS: Partial<Record<CrashSoundName, number>> = {
  bet: 500,
  cashout: 1000,
};

const cache = new Map<CrashSoundName, HTMLAudioElement>();
const stopTimers = new Map<CrashSoundName, ReturnType<typeof setTimeout>>();
let unlocked = false;

function getAudio(name: CrashSoundName): HTMLAudioElement {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
    audio.preload = 'auto';
    audio.volume = VOLUME;
    cache.set(name, audio);
  }
  return audio;
}

function clearStopTimer(name: CrashSoundName) {
  const timer = stopTimers.get(name);
  if (timer != null) {
    clearTimeout(timer);
    stopTimers.delete(name);
  }
}

export function stopCrashSound(name: CrashSoundName) {
  clearStopTimer(name);
  const audio = cache.get(name);
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = VOLUME;
  } catch {
    /* ignore */
  }
}

function unlockOnce() {
  if (unlocked) return;
  unlocked = true;
  for (const name of ['bet', 'cashout', 'cancel', 'crash'] as CrashSoundName[]) {
    const a = getAudio(name);
    a.muted = true;
    void a
      .play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      })
      .catch(() => {
        a.muted = false;
      });
  }
}

if (typeof window !== 'undefined') {
  const unlock = () => unlockOnce();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function playCrashSound(name: CrashSoundName) {
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    stopCrashSound(name);
    const audio = getAudio(name);
    audio.volume = VOLUME;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* autoplay / missing file */
    });
    const maxMs = MAX_DURATION_MS[name];
    if (maxMs != null) {
      stopTimers.set(
        name,
        setTimeout(() => {
          stopTimers.delete(name);
          stopCrashSound(name);
        }, maxMs)
      );
    }
  } catch {
    /* ignore */
  }
}
