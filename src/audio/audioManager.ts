/**
 * Audio manager — Web Audio, fully synthesised.
 *
 * PROJECT_SPEC.md §26 requires audio to be original, licensed, public domain or
 * otherwise legally usable. Rather than ship sourced files, every sound here is
 * generated at runtime from oscillators and noise buffers. That makes each cue
 * original work, adds zero bytes to the bundle, and removes the asset-licensing
 * blocker entirely.
 *
 * Everything is defensive. Audio is a garnish: if the browser blocks it, the
 * context fails to start, or a cue throws, the game must carry on silently
 * rather than break. No call here ever throws to its caller.
 *
 * Browsers start an AudioContext suspended until a user gesture, so
 * `unlockAudio()` is wired to the first interaction.
 */

export type SoundName =
  | 'wheelTick'
  | 'wheelRatchet'
  | 'wheelStop'
  | 'fateReveal'
  | 'eliminate'
  | 'wallBlock'
  | 'wallGain'
  | 'deathMark'
  | 'hunter'
  | 'duel'
  | 'revive'
  | 'phaseChange'
  | 'winner'
  // The C4 countdown. Two cues rather than one: the urgent variant is higher,
  // harder and doubled, so the last two rounds of a fuse sound different from
  // the first three without anyone having to read the number.
  | 'c4Tick'
  | 'c4TickUrgent';

export type AudioLevels = {
  master: number;
  sfx: number;
  muted: boolean;
};

let context: AudioContext | null = null;
let masterGain: GainNode | null = null;
let levels: AudioLevels = { master: 0.8, sfx: 0.8, muted: false };

function ensureContext(): AudioContext | null {
  if (context) return context;

  try {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    context = new Ctor();
    masterGain = context.createGain();
    masterGain.gain.value = effectiveVolume();
    masterGain.connect(context.destination);
    return context;
  } catch {
    return null;
  }
}

function effectiveVolume(): number {
  if (levels.muted) return 0;
  return Math.max(0, Math.min(1, levels.master)) * Math.max(0, Math.min(1, levels.sfx));
}

/** Called from the first user gesture; browsers refuse to start audio before one. */
export function unlockAudio(): void {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
}

export function setAudioLevels(next: AudioLevels): void {
  levels = next;
  if (masterGain && context) {
    masterGain.gain.setTargetAtTime(effectiveVolume(), context.currentTime, 0.01);
  }
}

// --- synthesis helpers ---

function envelope(
  gain: GainNode,
  start: number,
  peak: number,
  attack: number,
  decay: number,
): void {
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
}

function tone(
  ctx: AudioContext,
  destination: AudioNode,
  options: {
    type: OscillatorType;
    from: number;
    to?: number;
    at: number;
    duration: number;
    peak: number;
    attack?: number;
  },
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = options.type;
  osc.frequency.setValueAtTime(options.from, options.at);
  if (options.to !== undefined && options.to !== options.from) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(options.to, 1),
      options.at + options.duration,
    );
  }

  const attack = options.attack ?? 0.005;
  envelope(gain, options.at, options.peak, attack, options.duration);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(options.at);
  osc.stop(options.at + options.duration + attack + 0.05);
}

function noise(
  ctx: AudioContext,
  destination: AudioNode,
  options: { at: number; duration: number; peak: number; cutoff: number },
): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * options.duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Deterministic pseudo-noise: no Math.random, per AGENTS.md §7.5, and it
  // keeps every playback of a cue identical.
  let seed = 12345;
  for (let i = 0; i < frames; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x3fffffff - 1) * (1 - i / frames);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(options.cutoff, options.at);

  const gain = ctx.createGain();
  envelope(gain, options.at, options.peak, 0.003, options.duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  source.start(options.at);
  source.stop(options.at + options.duration + 0.05);
}

/**
 * One recipe per cue. Kept declarative so Enhancement Phase 7D can re-voice a
 * sound without touching anything that triggers it.
 */
function render(name: SoundName, ctx: AudioContext, out: AudioNode, now: number, pitch = 1): void {
  switch (name) {
    case 'wheelTick':
      tone(ctx, out, { type: 'square', from: 1500 * pitch, at: now, duration: 0.018, peak: 0.06 });
      break;

    // The pull, not the spin. A pawl dragging over a tooth is a heavier, duller
    // event than a segment flying past: lower, longer, with a scrape of noise
    // under it. Deliberately far from `wheelTick` in pitch — during the pull the
    // wheel is being loaded, and it should not sound like it is already going.
    case 'wheelRatchet':
      tone(ctx, out, { type: 'square', from: 320, to: 190, at: now, duration: 0.055, peak: 0.16 });
      noise(ctx, out, { at: now, duration: 0.035, peak: 0.1, cutoff: 900 });
      break;

    // The audio half of the impact flash. Deeper and longer than a tick, with a
    // short noise transient on top so it reads as something landing rather than
    // as one more click. The two land on the same frame, which is what makes the
    // stop feel like a single event instead of a visual and a sound.
    case 'wheelStop':
      tone(ctx, out, { type: 'sine', from: 190, to: 48, at: now, duration: 0.34, peak: 0.62 });
      tone(ctx, out, { type: 'triangle', from: 95, to: 40, at: now, duration: 0.26, peak: 0.3 });
      noise(ctx, out, { at: now, duration: 0.07, peak: 0.34, cutoff: 2400 });
      break;

    case 'fateReveal':
      tone(ctx, out, { type: 'triangle', from: 520, to: 900, at: now, duration: 0.14, peak: 0.32 });
      tone(ctx, out, {
        type: 'triangle',
        from: 780,
        to: 1320,
        at: now + 0.1,
        duration: 0.16,
        peak: 0.26,
      });
      break;

    case 'eliminate':
      noise(ctx, out, { at: now, duration: 0.3, peak: 0.6, cutoff: 1100 });
      tone(ctx, out, { type: 'sawtooth', from: 320, to: 45, at: now, duration: 0.42, peak: 0.5 });
      tone(ctx, out, {
        type: 'square',
        from: 150,
        to: 40,
        at: now + 0.05,
        duration: 0.3,
        peak: 0.24,
      });
      break;

    case 'wallBlock':
      tone(ctx, out, { type: 'square', from: 1180, to: 900, at: now, duration: 0.2, peak: 0.3 });
      tone(ctx, out, {
        type: 'square',
        from: 1760,
        to: 1400,
        at: now + 0.01,
        duration: 0.24,
        peak: 0.18,
      });
      noise(ctx, out, { at: now, duration: 0.05, peak: 0.2, cutoff: 4200 });
      break;

    case 'wallGain':
      tone(ctx, out, { type: 'sine', from: 620, to: 1240, at: now, duration: 0.26, peak: 0.28 });
      break;
    // A dry mechanical knock. Deliberately short and unmusical — it has to sit
    // under whatever else is happening each round without becoming the round.
    case 'c4Tick':
      tone(ctx, out, { type: 'square', from: 420, to: 300, at: now, duration: 0.09, peak: 0.2 });
      break;

    // Fuse 2 and 1. Higher, doubled, and the second knock lands late enough to
    // read as a heartbeat rather than an echo.
    case 'c4TickUrgent':
      tone(ctx, out, { type: 'square', from: 660, to: 460, at: now, duration: 0.08, peak: 0.3 });
      tone(ctx, out, {
        type: 'square',
        from: 660,
        to: 420,
        at: now + 0.16,
        duration: 0.1,
        peak: 0.34,
      });
      break;

    case 'deathMark':
      tone(ctx, out, { type: 'sine', from: 120, to: 70, at: now, duration: 0.5, peak: 0.42 });
      tone(ctx, out, {
        type: 'sawtooth',
        from: 88,
        to: 60,
        at: now + 0.12,
        duration: 0.44,
        peak: 0.16,
      });
      break;

    case 'hunter':
      for (let i = 0; i < 3; i += 1) {
        tone(ctx, out, {
          type: 'square',
          from: 1500,
          at: now + i * 0.09,
          duration: 0.05,
          peak: 0.2,
        });
      }
      break;

    case 'duel':
      noise(ctx, out, { at: now, duration: 0.14, peak: 0.4, cutoff: 5200 });
      tone(ctx, out, { type: 'sawtooth', from: 900, to: 300, at: now, duration: 0.26, peak: 0.34 });
      break;

    case 'revive':
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone(ctx, out, {
          type: 'triangle',
          from: freq,
          at: now + i * 0.07,
          duration: 0.2,
          peak: 0.24,
        });
      });
      break;

    case 'phaseChange':
      tone(ctx, out, { type: 'sawtooth', from: 440, to: 110, at: now, duration: 0.6, peak: 0.36 });
      noise(ctx, out, { at: now, duration: 0.35, peak: 0.2, cutoff: 900 });
      break;

    case 'winner':
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
        tone(ctx, out, {
          type: 'square',
          from: freq,
          at: now + i * 0.11,
          duration: 0.3,
          peak: 0.22,
        });
      });
      break;

    default:
      break;
  }
}

/**
 * Fire and forget. Silently does nothing when audio is unavailable or muted.
 *
 * `pitch` multiplies every frequency in the cue. It exists for the wheel tick:
 * a real wheel's clicks do not change pitch as it slows, only their spacing
 * does — but every game-show wheel bends them upward anyway, because rising
 * pitch is what the ear reads as tension building toward a result. Slowing
 * ticks alone read as "running out of energy", which is the opposite feeling.
 */
export function playSound(name: SoundName, pitch = 1): void {
  if (levels.muted || effectiveVolume() === 0) return;

  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === 'suspended') return;

  try {
    render(name, ctx, masterGain, ctx.currentTime, pitch);
  } catch {
    // A failed cue must never interrupt the game.
  }
}
