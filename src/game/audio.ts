export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private ambSrc: AudioBufferSourceNode | null = null;
  private ambKind = "";
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
      this.sfx.gain.value = 0.4;
      this.music.gain.value = 0.07;
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
    const g = this.ctx.createGain();
    o1.type = "sine";
    o2.type = "triangle";
    o1.frequency.value = 73;
    o2.frequency.value = 110;
    g.gain.value = 0.45;
    o1.connect(g);
    o2.connect(g);
    g.connect(this.music);
    o1.start();
    o2.start();
    this.drone = o1;
  }

  setAmbience(kind: "fire" | "sea" | "none") {
    if (!this.ctx || !this.music) return;
    if (kind === this.ambKind) return;
    this.ambKind = kind;
    try {
      this.ambSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.ambSrc = null;
    if (kind === "none" || this.muted) return;
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate * 3, rate);
    const data = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      v = kind === "fire" ? v * 0.985 + white * 0.015 : v * 0.97 + white * 0.03;
      let s = v;
      if (kind === "fire") {
        if (Math.random() < 0.0018) s += (Math.random() * 2 - 0.4) * 0.55;
        if (Math.random() < 0.0004) s += Math.random() * 0.9;
        s += Math.sin(i / 420) * 0.03;
      } else {
        s += Math.sin(i / 900) * 0.04;
      }
      data[i] = s;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = kind === "fire" ? "highpass" : "lowpass";
    f.frequency.value = kind === "fire" ? 180 : 420;
    const g = this.ctx.createGain();
    g.gain.value = kind === "fire" ? 0.28 : 0.18;
    src.connect(f);
    f.connect(g);
    g.connect(this.music);
    src.start();
    this.ambSrc = src;
  }

  crackle() {
    this.tone(90 + Math.random() * 80, 0.08, "sawtooth", 0.04, 40);
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
    this.tone(150 + Math.random() * 40, 0.04, "sine", 0.025);
  }
  pickup() {
    this.tone(520, 0.12, "sine", 0.09, 820);
  }
  talk() {
    this.tone(260, 0.07, "triangle", 0.055, 310);
  }
  hit() {
    this.tone(90, 0.11, "sawtooth", 0.11, 48);
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
