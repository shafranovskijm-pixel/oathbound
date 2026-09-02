export type AmbienceKind = "shore" | "sea" | "storm" | "tavern" | "fire" | "dungeon" | "hell" | "none";

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private ambSrc: AudioBufferSourceNode | null = null;
  private ambKind: AmbienceKind = "none";
  private ambBuffers = new Map<AmbienceKind, AudioBuffer>();
  muted = false;

  unlock() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.gain.value = 0.46;
      this.music.gain.value = 0.052;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.startDrone();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private startDrone() {
    if (!this.ctx || !this.music || this.drone) return;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const g = this.ctx.createGain();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 55;
    o2.frequency.value = 82.5;
    lfo.frequency.value = 0.075;
    lfoGain.gain.value = 0.08;
    g.gain.value = 0.34;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    o1.connect(g);
    o2.connect(g);
    g.connect(this.music);
    o1.start();
    o2.start();
    lfo.start();
    this.drone = o1;
  }

  setAmbience(kind: AmbienceKind) {
    if (!this.ctx || !this.music) return;
    if (kind === this.ambKind) return;
    this.ambKind = kind;
    try {
      this.ambSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.ambSrc?.disconnect();
    this.ambSrc = null;
    if (kind === "none") return;

    const rate = this.ctx.sampleRate;
    const length = rate * 4;
    let buf = this.ambBuffers.get(kind);
    if (!buf) {
      buf = this.ctx.createBuffer(2, length, rate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buf.getChannelData(channel);
        let low = 0;
        let slow = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          const phase = i / rate;
          low = low * 0.975 + white * 0.025;
          slow = slow * 0.998 + white * 0.002;
          const wave = Math.sin(phase * Math.PI * 2 * (kind === "storm" ? 0.16 : 0.1) + channel * 0.7);
          let sample = low;
          if (kind === "fire" || kind === "tavern") {
            sample = white * 0.13 + low * 0.24;
            if (Math.random() < 0.0015) sample += Math.random() * 0.9;
          } else if (kind === "hell") {
            const furnace = Math.sin(phase * 31 + channel * 0.9) * 0.035;
            const chain = Math.sin(phase * 2.1) > 0.998 ? white * 0.42 : 0;
            sample = slow * 1.25 + low * 0.42 + furnace + chain;
          } else if (kind === "dungeon") {
            sample = slow * 1.7 + Math.sin(phase * 47 + channel) * 0.035;
          } else {
            const swell = 0.32 + (wave + 1) * (kind === "storm" ? 0.42 : 0.22);
            sample = low * swell + slow * 0.7;
            if (kind === "shore") sample += Math.sin(phase * 17 + channel * 2.1) * 0.025;
          }
          data[i] = Math.max(-1, Math.min(1, sample));
        }
      }
      this.ambBuffers.set(kind, buf);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = kind === "fire" || kind === "tavern" ? "highpass" : "lowpass";
    filter.frequency.value = kind === "fire" ? 260 : kind === "tavern" ? 180 : kind === "storm" ? 620 : kind === "hell" ? 270 : kind === "dungeon" ? 210 : 470;
    const gain = this.ctx.createGain();
    gain.gain.value = kind === "storm" ? 0.24 : kind === "fire" ? 0.22 : kind === "tavern" ? 0.12 : kind === "hell" ? 0.18 : kind === "dungeon" ? 0.14 : 0.16;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    src.start();
    this.ambSrc = src;
  }

  private noiseBurst(duration: number, gainValue: number, frequency: number, highpass = false) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = highpass ? "highpass" : "lowpass";
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private chord(freqs: number[], duration: number, gain: number) {
    freqs.forEach((frequency, index) => this.tone(frequency, duration + index * 0.08, "sine", gain / Math.max(1, freqs.length), frequency * 1.06));
  }

  crackle() {
    this.noiseBurst(0.055, 0.045, 1350, true);
  }

  ambientDetail() {
    if (this.ambKind === "shore") {
      this.tone(980, 0.15, "sine", 0.018, 760);
      this.tone(1220, 0.12, "sine", 0.012, 940);
    } else if (this.ambKind === "sea") {
      this.tone(330, 0.38, "sine", 0.018, 260);
    } else if (this.ambKind === "storm") {
      this.noiseBurst(0.65, 0.07, 180);
    } else if (this.ambKind === "tavern") {
      this.chord([196, 246.9, 293.7], 0.55, 0.035);
    } else if (this.ambKind === "dungeon") {
      this.tone(124, 0.8, "sine", 0.024, 88);
    } else if (this.ambKind === "hell") {
      this.tone(92, 0.92, "sawtooth", 0.021, 61);
      this.noiseBurst(0.18, 0.025, 870, true);
    }
  }

  resume() {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.1, slide?: number) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  step() {
    this.tone(145 + Math.random() * 35, 0.035, "sine", 0.018);
  }
  pickup() {
    this.tone(520, 0.12, "sine", 0.09, 820);
  }
  talk() {
    this.tone(260, 0.07, "triangle", 0.055, 310);
  }
  devilLaugh() {
    this.tone(138, 0.34, "sawtooth", 0.085, 92);
    this.tone(196, 0.24, "triangle", 0.052, 136);
    this.noiseBurst(0.36, 0.045, 430);
  }
  hit() {
    this.tone(90, 0.11, "sawtooth", 0.11, 48);
  }
  shellCrack() {
    this.noiseBurst(0.17, 0.14, 920, true);
    this.tone(78, 0.14, "sawtooth", 0.07, 48);
  }
  cannon() {
    this.noiseBurst(0.24, 0.18, 680);
    this.tone(64, 0.25, "sawtooth", 0.12, 40);
  }
  sail() {
    this.noiseBurst(0.18, 0.06, 1150, true);
  }
  boatLaunch() {
    this.noiseBurst(0.65, 0.09, 480);
    this.chord([110, 164.8, 220], 0.65, 0.055);
  }
  lore() {
    this.chord([220, 277.2, 329.6], 0.78, 0.09);
  }
  bell() {
    this.tone(740, 0.65, "sine", 0.065, 700);
    this.tone(1110, 0.52, "sine", 0.032, 980);
  }
  spell() {
    this.tone(640, 0.16, "square", 0.06, 220);
  }
  ok() {
    this.tone(392, 0.16, "triangle", 0.09, 523);
  }
  hurt() {
    this.tone(70, 0.18, "sawtooth", 0.12, 40);
  }
  end() {
    this.tone(196, 0.45, "sine", 0.12, 392);
    this.tone(247, 0.55, "triangle", 0.06, 330);
  }
}
