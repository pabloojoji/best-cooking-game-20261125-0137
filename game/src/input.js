// Keyboard, mouse and touch input. Held keys steer the chef; one-shot presses
// (interact, drop, dash, pause, mute, recipes) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_INTERACT = 1;
export const ACTION_DROP = 2;
export const ACTION_DASH = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;
export const ACTION_RECIPES = 32;
export const ACTION_CONFIRM = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['Space', 'Enter']);
const DROP = new Set(['KeyQ']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RECIPES = new Set(['KeyR']);

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  /** The last pointer position on the canvas, for click-to-interact. */
  let pointer = null;

  function press(code, event) {
    if (UP.has(code)) up = true;
    else if (DOWN.has(code)) down = true;
    else if (LEFT.has(code)) left = true;
    else if (RIGHT.has(code)) right = true;
    else if (INTERACT.has(code)) {
      if (!event.repeat) actions |= ACTION_INTERACT | ACTION_CONFIRM;
    } else if (DROP.has(code)) {
      if (!event.repeat) actions |= ACTION_DROP;
    } else if (DASH.has(code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RECIPES.has(code)) {
      if (!event.repeat) actions |= ACTION_RECIPES;
    } else return;
    event.preventDefault();
  }

  function release(code) {
    if (UP.has(code)) up = false;
    else if (DOWN.has(code)) down = false;
    else if (LEFT.has(code)) left = false;
    else if (RIGHT.has(code)) right = false;
  }

  window.addEventListener('keydown', (event) => press(event.code, event));
  window.addEventListener('keyup', (event) => release(event.code));
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = {
      x: ((event.clientX - rect.left) / rect.width) * 1280,
      y: ((event.clientY - rect.top) / rect.height) * 720,
    };
    actions |= ACTION_INTERACT | ACTION_CONFIRM;
  });

  return {
    /** The steering direction, each axis -1, 0 or 1. */
    direction() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last pointer position, or null; cleared after one read. */
    takePointer() {
      const p = pointer;
      pointer = null;
      return p;
    },
  };
}
