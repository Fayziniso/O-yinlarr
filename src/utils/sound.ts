// Procedural Web Audio API sound effects (zero external dependencies, never autoplays)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.14,
    delay = 0,
    slideTo?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this.tone(540, 0.06, 'triangle', 0.08, 0, 720);
  }

  playSelect() {
    this.tone(440, 0.08, 'sine', 0.1, 0, 620);
    this.tone(660, 0.09, 'sine', 0.08, 0.05);
  }

  playCollect() {
    this.tone(587.33, 0.09, 'sine', 0.12, 0);
    this.tone(880, 0.14, 'triangle', 0.12, 0.06);
  }

  playSuccess() {
    this.tone(523.25, 0.11, 'triangle', 0.13, 0);
    this.tone(659.25, 0.11, 'triangle', 0.13, 0.08);
    this.tone(783.99, 0.18, 'triangle', 0.14, 0.16);
  }

  playError() {
    this.tone(240, 0.14, 'sawtooth', 0.09, 0, 170);
    this.tone(180, 0.16, 'sawtooth', 0.08, 0.1, 130);
  }

  playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, i === 3 ? 0.35 : 0.13, 'triangle', 0.14, i * 0.1);
    });
  }

  playLose() {
    const notes = [392, 349.23, 311.13, 261.63];
    notes.forEach((n, i) => {
      this.tone(n, 0.18, 'sawtooth', 0.08, i * 0.12);
    });
  }

  playShoot() {
    this.tone(760, 0.11, 'sawtooth', 0.09, 0, 210);
  }

  playBounce() {
    this.tone(220, 0.1, 'sine', 0.14, 0, 110);
  }

  playExplosion() {
    this.tone(140, 0.22, 'sawtooth', 0.13, 0, 40);
    this.tone(95, 0.25, 'square', 0.08, 0.04, 32);
  }

  playAnimal(animal: 'mushuk' | 'kuchuk' | 'sigir' | 'ordak' | 'sher' | 'quyon') {
    switch (animal) {
      case 'mushuk': // Meow glide
        this.tone(620, 0.18, 'sine', 0.13, 0, 880);
        this.tone(860, 0.28, 'triangle', 0.12, 0.16, 460);
        break;
      case 'kuchuk': // Bark-bark
        this.tone(280, 0.11, 'sawtooth', 0.11, 0, 190);
        this.tone(310, 0.12, 'sawtooth', 0.11, 0.16, 175);
        break;
      case 'sigir': // Low moo
        this.tone(155, 0.55, 'sawtooth', 0.1, 0, 125);
        break;
      case 'ordak': // Quack-quack
        this.tone(420, 0.1, 'square', 0.08, 0, 310);
        this.tone(440, 0.1, 'square', 0.08, 0.14, 300);
        break;
      case 'sher': // Deep roar
        this.tone(180, 0.45, 'sawtooth', 0.13, 0, 75);
        this.tone(130, 0.4, 'square', 0.08, 0.08, 60);
        break;
      case 'quyon': // Hoppy chirp
        this.tone(720, 0.08, 'sine', 0.11, 0, 960);
        this.tone(820, 0.09, 'sine', 0.11, 0.11, 1080);
        break;
    }
  }

  speakUzbek(text: string) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'uz-UZ';
      utter.rate = 0.92;
      utter.pitch = 1.1;
      utter.volume = 0.85;
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech synthesis optional
    }
  }
}

export const sound = new SoundEngine();
