// Every sound is synthesized with WebAudio: no audio files, no network. The
// context is made lazily on the first gesture (browsers block sound before one),
// every call is guarded, and muting silences the master gain. Screenshot scenes
// never gesture, so they stay silent.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  /** A sunny music-box tune, one soft sine note a step, looping over 16 steps. */
  const SUNNY_TUNE = [523, 659, 784, 659, 880, 784, 659, 587, 523, 587, 659, 784, 659, 523, 440, 0];

  function ensure() {
    if (ctx !== null) return ctx !== null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx !== null;
  }

  /** Wake the audio on a user gesture, and start the sunny tune with it. */
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    startMusic();
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = 0) {
    if (ctx === null || muted) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  function startMusic() {
    if (musicTimer !== null || ctx === null) return;
    musicTimer = window.setInterval(() => {
      if (muted || ctx === null) return;
      const note = SUNNY_TUNE[musicStep % SUNNY_TUNE.length];
      musicStep += 1;
      if (note > 0) tone(note, 0.9, 'sine', 0.05);
    }, 480);
  }

  return {
    unlock,
    /** Flip the mute; returns the new muted state. */
    toggleMute() {
      muted = !muted;
      if (master !== null) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.18, 0, 780);
    },
    place() {
      tone(220, 0.09, 'triangle', 0.2, 0, 160);
    },
    chop() {
      tone(180, 0.06, 'square', 0.1);
      tone(140, 0.06, 'square', 0.08, 0.05);
    },
    ding() {
      tone(880, 0.18, 'sine', 0.2);
      tone(1318, 0.3, 'sine', 0.16, 0.09);
    },
    perfect() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.18, i * 0.07));
    },
    serve() {
      [659, 784, 988].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, i * 0.06));
      tone(1318, 0.3, 'sine', 0.14, 0.18);
    },
    coin() {
      tone(988, 0.1, 'sine', 0.16);
      tone(1318, 0.22, 'sine', 0.16, 0.08);
    },
    burn() {
      tone(110, 0.5, 'sawtooth', 0.16, 0, 70);
    },
    expire() {
      tone(392, 0.2, 'triangle', 0.16, 0, 262);
      tone(262, 0.3, 'triangle', 0.14, 0.18, 196);
    },
    rush() {
      tone(740, 0.16, 'square', 0.12);
      tone(988, 0.16, 'square', 0.12, 0.18);
      tone(740, 0.16, 'square', 0.12, 0.36);
      tone(988, 0.28, 'square', 0.12, 0.54);
    },
    deny() {
      tone(196, 0.12, 'square', 0.12);
    },
    dash() {
      tone(300, 0.12, 'sine', 0.08, 0, 520);
    },
  };
}
