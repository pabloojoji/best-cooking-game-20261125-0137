// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and shift over. On the title screen the autopilot runs the kitchen
// behind the title, so it is alive before the first press.
//
// ?seed=N fixes the order deck. ?shot=start|play|rush|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_DASH,
  ACTION_DROP,
  ACTION_INTERACT,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RECIPES,
  createInput,
} from './input.js';
import {
  EVENT_BAKE_READY,
  EVENT_BURNT,
  EVENT_DENY,
  EVENT_EXPIRED,
  EVENT_MIX_DONE,
  EVENT_OVER,
  EVENT_PERFECT,
  EVENT_RUSH,
  EVENT_SERVED,
  EVENT_STATION_DONE,
  createWorld,
} from './world.js';
import { createAutopilot } from './autopilot.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { showRecipes: false, blink: true });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const pilot = createAutopilot();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let showRecipes = false;
  let accumulator = 0;
  let last = performance.now();

  // A handle for play-testing in a headless browser: the world and the screen.
  window.__game = {
    world,
    get screen() {
      return screen;
    },
    startGame,
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    showRecipes = false;
    screen = SCREEN_PLAY;
    announce('Playing. Serve the regulars before closing time.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Earnings $${world.state.score}. Best $${best}.`);
  }

  function playSound(events) {
    if (events & EVENT_SERVED) audio.serve();
    if (events & EVENT_PERFECT) audio.perfect();
    if (events & EVENT_EXPIRED) audio.expire();
    if (events & EVENT_BURNT) audio.burn();
    if (events & EVENT_MIX_DONE) audio.ding();
    if (events & EVENT_BAKE_READY) audio.ding();
    if (events & EVENT_STATION_DONE) audio.ding();
    if (events & EVENT_RUSH) audio.rush();
    if (events & EVENT_DENY) audio.deny();
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RECIPES && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      showRecipes = !showRecipes;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions, first) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, pilot.input(world.state, STEP), true);
      return;
    }
    const dir = input.direction();
    const pulse = first === true ? actions : 0;
    const events = world.step(
      STEP,
      {
        dx: dir.x,
        dy: dir.y,
        interact: (pulse & ACTION_INTERACT) !== 0,
        dash: (pulse & ACTION_DASH) !== 0,
        drop: (pulse & ACTION_DROP) !== 0,
      },
      false,
    );
    playSound(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_SERVED) announce(`Served. $${world.state.score} so far.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & (ACTION_INTERACT | ACTION_CONFIRM)) audio.unlock();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions, first);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, {
      showRecipes,
      blink: Math.floor(now / 500) % 2 === 0,
    });
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sugar & Sprinkles, Sunny Bakery. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
