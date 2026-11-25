// The screenshot scenes behind ?shot=start|play|rush|end. Each one plays the
// real rules forward from a fresh world, steered by the autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same
// frame. A scene stops as soon as its frame reads well, or at its time limit.

import { STEP } from './config.js';
import { createAutopilot } from './autopilot.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 45;
const RUSH_LIMIT_SECONDS = 150;
const END_LIMIT_SECONDS = 200;

/** A play frame reads when a dish is mid-assembly, a plate is ready to serve and orders are open. */
function goodPlayFrame(state) {
  const busy = state.mixer.mixing !== null || state.oven.dish !== null;
  const carrying = state.player.carrying;
  const plated = state.pass.some((s) => s !== null) || (carrying !== null && (carrying.kind === 'plated' || carrying.kind === 'finished'));
  return busy && plated && state.orders.length >= 2 && state.time > 10;
}

/** A rush frame reads when the rush is on, the board is full and the combo is rolling. */
function goodRushFrame(state) {
  return state.rush.phase === 'active' && state.orders.length >= 4 && state.combo >= 3;
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const pilot = createAutopilot();
  if (name !== 'play' && name !== 'rush' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, pilot.input(world.state, STEP), true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'rush' ? RUSH_LIMIT_SECONDS : PLAY_LIMIT_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, pilot.input(world.state, STEP), false);
    if (events & EVENT_OVER) break;
    if (name === 'play' && goodPlayFrame(world.state)) break;
    if (name === 'rush' && goodRushFrame(world.state)) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
