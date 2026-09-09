export type CrashSoundName = 'bet' | 'cashout' | 'cancel' | 'crash';

const VOLUME = 0.35;
const cache = new Map<CrashSoundName, HTMLAudioElement>();
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
    const audio = getAudio(name);
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* autoplay / missing file */
    });
  } catch {
    /* ignore */
  }
}
