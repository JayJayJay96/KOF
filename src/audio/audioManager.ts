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
  | 'wheelStop'
  | 'fateReveal'
  | 'eliminate'
  | 'shieldBlock'
  | 'shieldGain'
  | 'deathMark'
  | 'hunter'
  | 'duel'
  | 'revive'
  | 'phaseChange'
  | 'winner';

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

export function getAudioLevels(): AudioLevels {
  return levels;
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
function render(name: SoundName, ctx: AudioContext, out: AudioNode, now: number): void {
  switch (name) {
    case 'wheelTick':
      tone(ctx, out, { type: 'square', from: 1500, at: now, duration: 0.018, peak: 0.06 });
      break;

    case 'wheelStop':
      tone(ctx, out, { type: 'sine', from: 220, to: 70, at: now, duration: 0.22, peak: 0.5 });
      noise(ctx, out, { at: now, duration: 0.09, peak: 0.28, cutoff: 1800 });
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

    case 'shieldBlock':
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

    case 'shieldGain':
      tone(ctx, out, { type: 'sine', from: 620, to: 1240, at: now, duration: 0.26, peak: 0.28 });
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

/** Fire and forget. Silently does nothing when audio is unavailable or muted. */
export function playSound(name: SoundName): void {
  if (levels.muted || effectiveVolume() === 0) return;

  const ctx = ensureContext();
  if (!ctx || !masterGain) return;
  if (ctx.state === 'suspended') return;

  try {
    render(name, ctx, masterGain, ctx.currentTime);
  } catch {
    // A failed cue must never interrupt the game.
  }
}
