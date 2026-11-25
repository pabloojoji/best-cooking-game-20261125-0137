// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 720, hudHeight: 76 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts three minutes of kitchen time. */
export const SHIFT_SECONDS = 180;

export const PLAYER = {
  radius: 15,
  speed: 255,
  dashSpeed: 460,
  dashTime: 0.35,
  dashCooldown: 1.2,
};

export const HEARTS = 3;

/** How far, in pixels, the chef must be from a station's edge to use it. */
export const INTERACT_RANGE = 62;

/** Seconds an interact stays ignored after one fires, so one press never acts twice. */
export const INTERACT_COOLDOWN = 0.2;

/** Orders: spawn cadence, caps and timers, normal and rush. */
export const ORDERS = {
  firstAt: 2,
  interval: 13,
  rushInterval: 8,
  max: 4,
  rushMax: 5,
  time: 50,
  rushTime: 36,
  vipTime: 62,
  vipChance: 0.2,
};

/** The Birthday Rush: warning seconds, then rush seconds, at these shift times. */
export const RUSH = {
  at: [60, 120],
  warn: 8,
  length: 25,
};

/** Combo: every two serves in a row raises the pay multiplier one step, to x4. */
export const COMBO = { perLevel: 2, maxLevel: 4, perfectBonus: 5 };

/** Seconds each station takes to finish its job. */
export const STATION_TIME = { mix: 2.5, frost: 2, decor: 2 };

/** The oven: a dish is ready at its bake time, perfect until then plus this, burnt after that plus this. */
export const OVEN = { perfectWindow: 1.5, burnAfter: 4 };

/** The serving pass holds this many plated dishes, each rung for a second before it serves. */
export const PASS = { slots: 3, serveDelay: 1 };

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sugar-and-sprinkles.best';

/** A bright, cheerful palette for young cooks: sunny yellow, sky blue, mint green and candy pink on light cream. */
export const PALETTE = {
  floorA: '#fdf3c4',
  floorB: '#f9e9a8',
  wall: '#3a7bd5',
  counterTop: '#ffffff',
  counterFront: '#8ecae6',
  counterEdge: '#5aa9d6',
  cream: '#fffdf5',
  ink: '#2b3a4a',
  inkSoft: '#5a6b7d',
  rose: '#ff6b9d',
  roseDeep: '#e2546e',
  gold: '#ffc93c',
  goldDeep: '#f0a500',
  green: '#3ecf8e',
  red: '#ff5a5a',
  hud: '#1e5aa8',
  hudPanel: '#2b6cb8',
  text: '#fffdf5',
  muted: '#bfe0f5',
  panel: '#ffffff',
  panelEdge: '#8ecae6',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
