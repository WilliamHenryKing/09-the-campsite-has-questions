// Sound design: one Web Audio graph with music, ambience and effect buses.
// Nothing loads or plays until the first user gesture; mute persists per viewer.

export type Sfx =
  | "click"
  | "pickup"
  | "turn"
  | "talk"
  | "board-open"
  | "board-close"
  | "tick"
  | "select"
  | "beat-ok"
  | "beat-unproven"
  | "contradiction"
  | "stamp"
  | "returned"
  | "begin"
  | "bell"
  | "kettle"
  | "creak"
  | "step"
  | "book"
  | "thud"
  | "cloth"
  | "peg"
  | "jingle-closed"
  | "jingle-finale";

export type Ambience = "afternoon" | "rain" | "dawn";

const SFX: Sfx[] = [
  "click",
  "pickup",
  "turn",
  "talk",
  "board-open",
  "board-close",
  "tick",
  "select",
  "beat-ok",
  "beat-unproven",
  "contradiction",
  "stamp",
  "returned",
  "begin",
  "bell",
  "kettle",
  "creak",
  "step",
  "book",
  "thud",
  "cloth",
  "peg",
  "jingle-closed",
  "jingle-finale",
];

/** Which loops play at each time of day, and how loud. */
const BEDS: Record<Ambience, [string, number][]> = {
  afternoon: [["amb-birds", 0.55]],
  rain: [["amb-rain", 0.7]],
  dawn: [
    ["amb-crickets", 0.45],
    ["amb-birds", 0.25],
  ],
};

const MUSIC_LEVEL = 0.32;
const STORE_KEY = "campsite-muted";
const base = `${import.meta.env.BASE_URL}audio/`;

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private amb: GainNode | null = null;
  private sfx: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private ambience: Ambience = "afternoon";
  private lastPlayed = new Map<string, number>();
  private listeners = new Set<(muted: boolean) => void>();
  muted = typeof window !== "undefined" ? readMuted() : false;

  /** Call from a user gesture: creates the context, then streams in the sounds. */
  unlock() {
    if (this.ctx || typeof window === "undefined" || !("AudioContext" in window)) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.music = this.bus(MUSIC_LEVEL);
    this.amb = this.bus(1);
    this.sfx = this.bus(0.8);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
    void this.loadAll();
  }

  onMute(cb: (muted: boolean) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      window.localStorage.setItem(STORE_KEY, muted ? "1" : "0");
    } catch {
      // Private windows may refuse storage; the toggle still works for this visit.
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    for (const l of this.listeners) l(muted);
  }

  toggle() {
    this.setMuted(!this.muted);
  }

  play(name: Sfx, opts: { volume?: number; rate?: number; gap?: number } = {}) {
    const ctx = this.ctx;
    const buf = this.buffers.get(`sfx-${name}`);
    if (!ctx || !buf || !this.sfx || this.muted) return;
    // A small gap stops rapid repeats (drags, footsteps) from stacking into noise.
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < (opts.gap ?? 0.04)) return;
    this.lastPlayed.set(name, now);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (opts.rate ?? 1) * (0.96 + Math.random() * 0.08);
    const g = ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g).connect(this.sfx);
    src.start();
  }

  /** Crossfade the ambient bed to a new time of day. */
  setAmbience(time: Ambience) {
    this.ambience = time;
    this.applyAmbience();
  }

  /** Lower the music under replays and reports so the scene sounds carry. */
  duck(on: boolean) {
    if (!this.ctx || !this.music) return;
    this.music.gain.setTargetAtTime(
      on ? MUSIC_LEVEL * 0.4 : MUSIC_LEVEL,
      this.ctx.currentTime,
      0.3,
    );
  }

  private bus(level: number) {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(this.master as GainNode);
    return g;
  }

  private async load(name: string) {
    if (!this.ctx || this.buffers.has(name)) return;
    try {
      const res = await fetch(`${base}${name}.mp3`);
      const data = await res.arrayBuffer();
      this.buffers.set(name, await this.ctx.decodeAudioData(data));
    } catch {
      // A missing or undecodable file only silences that one sound.
    }
  }

  private async loadAll() {
    // Beds first so the camp sounds alive quickly, then effects, then the music.
    await Promise.all(["amb-birds", "amb-rain", "amb-crickets"].map((n) => this.load(n)));
    this.applyAmbience();
    await Promise.all(SFX.map((n) => this.load(`sfx-${n}`)));
    await this.load("music-cozy");
    this.startLoop("music-cozy", this.music as GainNode, 1, 2.5);
  }

  private applyAmbience() {
    if (!this.ctx || !this.amb) return;
    const wanted = new Map(BEDS[this.ambience]);
    for (const [name, loop] of this.loops) {
      if (name.startsWith("amb-") && !wanted.has(name)) {
        loop.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
        const src = loop.src;
        window.setTimeout(() => src.stop(), 3000);
        this.loops.delete(name);
      }
    }
    for (const [name, level] of wanted) {
      const loop = this.loops.get(name);
      if (loop) loop.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.6);
      else this.startLoop(name, this.amb, level, 1.5);
    }
  }

  private startLoop(name: string, bus: GainNode, level: number, fadeIn: number) {
    const ctx = this.ctx;
    const buf = this.buffers.get(name);
    if (!ctx || !buf || this.loops.has(name)) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // Skip the MP3 encoder padding at both ends so the loop has no click or gap.
    src.loopStart = Math.min(0.06, buf.duration / 4);
    src.loopEnd = Math.max(src.loopStart + 0.1, buf.duration - 0.06);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(level, ctx.currentTime, fadeIn / 3);
    src.connect(gain).connect(bus);
    src.start(0, src.loopStart);
    this.loops.set(name, { src, gain });
  }
}

export const sound = new Sound();
