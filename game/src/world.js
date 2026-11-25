// The kitchen's state and rules: the chef, the stations, the orders, the rush
// and the score. Everything here runs on a fixed 1/60 s step from a seeded
// generator, so the same seed always plays the same shift.

import {
  COMBO,
  FIELD,
  HEARTS,
  INTERACT_COOLDOWN,
  INTERACT_RANGE,
  ORDERS,
  OVEN,
  PASS,
  PLAYER,
  RUSH,
  SHIFT_SECONDS,
  STATION_TIME,
} from './config.js';
import { CUSTOMERS, DISHES, DISH_IDS, INGREDIENTS } from './recipes.js';
import { pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_PERFECT = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_BURNT = 8;
export const EVENT_OVER = 16;
export const EVENT_PICKUP = 32;
export const EVENT_PLACE = 64;
export const EVENT_MIX_DONE = 128;
export const EVENT_BAKE_READY = 256;
export const EVENT_RUSH = 512;
export const EVENT_DENY = 1024;
export const EVENT_DASH = 2048;
export const EVENT_STATION_DONE = 4096;

/** The stations' rectangles on the floor, in canvas pixels. */
export const STATION_RECTS = {
  mixer: { x: 448, y: 76, w: 128, h: 64 },
  oven: { x: 640, y: 76, w: 128, h: 64 },
  frosting: { x: 832, y: 76, w: 128, h: 64 },
  decorating: { x: 1024, y: 76, w: 128, h: 64 },
  plates: { x: 1216, y: 76, w: 64, h: 64 },
  pass: { x: 448, y: 656, w: 384, h: 60 },
  compost: { x: 896, y: 656, w: 128, h: 60 },
};

/** The pantry's six bins, one per ingredient, along the top wall. */
export const PANTRY_BINS = [
  { id: 'flour', x: 0, y: 76, w: 64, h: 64 },
  { id: 'egg', x: 64, y: 76, w: 64, h: 64 },
  { id: 'butter', x: 128, y: 76, w: 64, h: 64 },
  { id: 'chocolate', x: 192, y: 76, w: 64, h: 64 },
  { id: 'strawberry', x: 256, y: 76, w: 64, h: 64 },
  { id: 'cream', x: 320, y: 76, w: 64, h: 64 },
];

/** Where the chef stands to use each station. */
export const STATION_FRONT = {
  mixer: { x: 512, y: 172 },
  oven: { x: 704, y: 172 },
  frosting: { x: 896, y: 172 },
  decorating: { x: 1088, y: 172 },
  plates: { x: 1248, y: 172 },
  pass: { x: 640, y: 624 },
  compost: { x: 960, y: 624 },
};

export function pantryFront(index) {
  return { x: index * 64 + 32, y: 172 };
}

/** Everything the chef cannot walk through: stations, filler counters, the island. */
export const SOLID_RECTS = [
  ...PANTRY_BINS,
  { x: 384, y: 76, w: 64, h: 64 },
  STATION_RECTS.mixer,
  { x: 576, y: 76, w: 64, h: 64 },
  STATION_RECTS.oven,
  { x: 768, y: 76, w: 64, h: 64 },
  STATION_RECTS.frosting,
  { x: 960, y: 76, w: 64, h: 64 },
  STATION_RECTS.decorating,
  { x: 1152, y: 76, w: 64, h: 64 },
  STATION_RECTS.plates,
  { x: 0, y: 332, w: 64, h: 256 },
  { x: 1216, y: 332, w: 64, h: 256 },
  { x: 512, y: 332, w: 256, h: 128 },
  { x: 0, y: 656, w: 448, h: 60 },
  STATION_RECTS.pass,
  { x: 832, y: 656, w: 64, h: 60 },
  STATION_RECTS.compost,
  { x: 1024, y: 656, w: 256, h: 60 },
];

/** The distance from a point to a rectangle, 0 when the point is inside it. */
function distToRect(px, py, r) {
  const cx = Math.max(r.x, Math.min(px, r.x + r.w));
  const cy = Math.max(r.y, Math.min(py, r.y + r.h));
  return Math.hypot(px - cx, py - cy);
}

/** The nearest station (or pantry bin) to the chef, within reach, or null. */
export function nearestStation(state) {
  const p = state.player;
  let best = null;
  let bestDist = INTERACT_RANGE;
  for (const bin of PANTRY_BINS) {
    const d = distToRect(p.x, p.y, bin);
    if (d < bestDist) {
      bestDist = d;
      best = { id: `pantry-${bin.id}`, rect: bin, dist: d };
    }
  }
  for (const [id, rect] of Object.entries(STATION_RECTS)) {
    const d = distToRect(p.x, p.y, rect);
    if (d < bestDist) {
      bestDist = d;
      best = { id, rect, dist: d };
    }
  }
  return best;
}

/** Whether `items` (ingredient ids) is a subset of some dish's ingredients. */
function viableMix(items) {
  return DISH_IDS.some((id) => items.every((ing) => DISHES[id].ingredients.includes(ing)));
}

/** The dish whose ingredient list exactly matches `items`, or null. */
function exactDish(items) {
  return DISH_IDS.find((id) => {
    const want = DISHES[id].ingredients;
    return want.length === items.length && want.every((ing) => items.includes(ing));
  }) ?? null;
}

export function createWorld(random) {
  let nextOrderId = 1;
  let state = null;

  function freshState() {
    return {
      time: 0,
      timeLeft: SHIFT_SECONDS,
      score: 0,
      combo: 0,
      maxCombo: 0,
      hearts: HEARTS,
      served: 0,
      perfect: 0,
      burnt: 0,
      over: false,
      overReason: '',
      player: {
        x: 640,
        y: 520,
        dir: 1,
        carrying: null,
        dashT: 0,
        dashCd: 0,
        moving: false,
      },
      mixer: { items: [], mixing: null, ready: null },
      oven: { dish: null, t: 0, burnt: false, readyAnnounced: false },
      frosting: { dish: null, t: 0, done: false },
      decorating: { dish: null, t: 0, done: false },
      pass: [null, null, null],
      floor: [],
      orders: [],
      spawnT: ORDERS.firstAt,
      rush: { phase: 'idle', t: 0, index: 0 },
      particles: [],
      floats: [],
      hint: '',
      interactCd: 0,
    };
  }

  function spawnParticles(x, y, color, n, spread) {
    for (let i = 0; i < n && state.particles.length < 120; i += 1) {
      const a = random() * Math.PI * 2;
      const v = 40 + random() * spread;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        t: 0,
        life: 0.6 + random() * 0.5,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, t: 0, life: 1.2, color });
  }

  function spawnOrder() {
    const dish = pick(random, DISH_IDS);
    const vip = random() < ORDERS.vipChance;
    const rushActive = state.rush.phase === 'active';
    const left = vip ? ORDERS.vipTime : rushActive ? ORDERS.rushTime : ORDERS.time;
    state.orders.push({
      id: nextOrderId,
      customer: pick(random, CUSTOMERS),
      dish,
      left,
      total: left,
      vip,
    });
    nextOrderId += 1;
  }

  function payMultiplier() {
    return Math.min(COMBO.maxLevel, 1 + Math.floor(state.combo / COMBO.perLevel));
  }

  function serveDish(slot) {
    const plated = state.pass[slot];
    if (plated === null) return 0;
    const orderIndex = state.orders.findIndex((o) => o.dish === plated.dish);
    if (orderIndex < 0) return 0;
    const order = state.orders[orderIndex];
    state.orders.splice(orderIndex, 1);
    state.pass[slot] = null;
    const base = DISHES[plated.dish].price * (order.vip ? 2 : 1);
    const pay = Math.round(base * payMultiplier()) + (plated.quality === 'perfect' ? COMBO.perfectBonus : 0);
    state.score += pay;
    state.served += 1;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    if (plated.quality === 'perfect') state.perfect += 1;
    addFloat(640, 620, `+$${pay}  ${order.customer}`, '#e8b64c');
    if (plated.quality === 'perfect') addFloat(640, 596, 'PERFECT BAKE!', '#c0395a');
    spawnParticles(640, 640, '#e8b64c', 14, 90);
    return EVENT_SERVED | (plated.quality === 'perfect' ? EVENT_PERFECT : 0);
  }

  function loseHeart() {
    state.hearts -= 1;
    state.combo = 0;
    if (state.hearts <= 0) {
      state.over = true;
      state.overReason = 'hearts';
      return EVENT_OVER;
    }
    return 0;
  }

  function tryInteract() {
    const p = state.player;
    const near = nearestStation(state);
    if (near === null) {
      // No station in reach: pick up something dropped on the floor.
      const item = state.floor.find((f) => Math.hypot(f.x - p.x, f.y - p.y) < 44);
      if (item !== null && item !== undefined && p.carrying === null) {
        state.floor.splice(state.floor.indexOf(item), 1);
        p.carrying = { kind: item.kind, dish: item.dish, id: item.id, quality: item.quality };
        return EVENT_PICKUP;
      }
      return 0;
    }
    const id = near.id;
    const carrying = p.carrying;

    if (id.startsWith('pantry-')) {
      if (carrying !== null) return EVENT_DENY;
      if (state.orders.length === 0) {
        state.hint = 'No orders yet — wait for the next ticket.';
        return EVENT_DENY;
      }
      // One trip: the basket holds everything the oldest order asks for.
      p.carrying = { kind: 'basket', dish: state.orders[0].dish };
      return EVENT_PICKUP;
    }

    if (id === 'mixer') {
      const m = state.mixer;
      if (m.mixing !== null) return 0;
      if (m.ready !== null) {
        if (carrying !== null) return EVENT_DENY;
        p.carrying = { kind: 'batter', dish: m.ready };
        m.ready = null;
        return EVENT_PICKUP;
      }
      if (carrying !== null && carrying.kind === 'basket') {
        if (m.items.length > 0) {
          state.hint = 'The mixer already has ingredients — dump it first.';
          return EVENT_DENY;
        }
        m.items = [...DISHES[carrying.dish].ingredients];
        p.carrying = null;
        return EVENT_PLACE;
      }
      if (carrying !== null && carrying.kind === 'ingredient') {
        const next = [...m.items, carrying.id];
        if (m.items.includes(carrying.id) || !viableMix(next)) {
          state.hint = m.items.includes(carrying.id) ? 'That is already in the mixer.' : 'That will not mix into any dish.';
          return EVENT_DENY;
        }
        m.items = next;
        p.carrying = null;
        return EVENT_PLACE;
      }
      if (carrying === null && m.items.length > 0) {
        const dish = exactDish(m.items);
        if (dish !== null) {
          m.mixing = 0;
          return EVENT_PLACE;
        }
        m.items = [];
        state.hint = 'Dumped the mixer.';
        return EVENT_PLACE;
      }
      return 0;
    }

    if (id === 'oven') {
      const o = state.oven;
      if (carrying !== null && carrying.kind === 'batter') {
        if (o.dish !== null) return EVENT_DENY;
        o.dish = carrying.dish;
        o.t = 0;
        o.burnt = false;
        o.readyAnnounced = false;
        p.carrying = null;
        return EVENT_PLACE;
      }
      if (carrying === null && o.dish !== null) {
        const dish = DISHES[o.dish];
        if (o.t < dish.bake) return 0;
        const quality = o.t <= dish.bake + OVEN.perfectWindow ? 'perfect' : 'ok';
        p.carrying = { kind: 'baked', dish: o.dish, quality };
        if (o.burnt) p.carrying = { kind: 'burnt', dish: o.dish };
        o.dish = null;
        o.t = 0;
        o.burnt = false;
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (id === 'frosting') {
      const f = state.frosting;
      if (carrying !== null && carrying.kind === 'baked' && DISHES[carrying.dish].frost) {
        if (f.dish !== null) return EVENT_DENY;
        f.dish = carrying.dish;
        f.quality = carrying.quality;
        f.t = 0;
        f.done = false;
        p.carrying = null;
        return EVENT_PLACE;
      }
      if (carrying === null && f.done) {
        p.carrying = { kind: 'frosted', dish: f.dish, quality: f.quality };
        f.dish = null;
        f.t = 0;
        f.done = false;
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (id === 'decorating') {
      const d = state.decorating;
      const ok =
        carrying !== null &&
        ((carrying.kind === 'frosted' && DISHES[carrying.dish].decor) ||
          (carrying.kind === 'baked' && !DISHES[carrying.dish].frost && DISHES[carrying.dish].decor) ||
          (carrying.kind === 'batter' && DISHES[carrying.dish].bake === 0 && !DISHES[carrying.dish].frost && DISHES[carrying.dish].decor));
      if (ok) {
        if (d.dish !== null) return EVENT_DENY;
        d.dish = carrying.dish;
        d.quality = carrying.quality ?? 'ok';
        d.t = 0;
        d.done = false;
        p.carrying = null;
        return EVENT_PLACE;
      }
      if (carrying === null && d.done) {
        p.carrying = { kind: 'finished', dish: d.dish, quality: d.quality };
        d.dish = null;
        d.t = 0;
        d.done = false;
        return EVENT_PICKUP;
      }
      return 0;
    }

    if (id === 'plates') {
      if (carrying !== null && carrying.kind === 'finished') {
        p.carrying = { kind: 'plated', dish: carrying.dish, quality: carrying.quality };
        return EVENT_PLACE;
      }
      // A frosted dish with no decorating step is done: it plates as it is.
      if (carrying !== null && carrying.kind === 'frosted' && !DISHES[carrying.dish].decor) {
        p.carrying = { kind: 'plated', dish: carrying.dish, quality: carrying.quality };
        return EVENT_PLACE;
      }
      return 0;
    }

    if (id === 'pass') {
      if (carrying !== null && carrying.kind === 'plated') {
        const slot = state.pass.findIndex((s) => s === null);
        if (slot < 0) {
          state.hint = 'The pass is full.';
          return EVENT_DENY;
        }
        state.pass[slot] = { dish: carrying.dish, quality: carrying.quality, t: PASS.serveDelay };
        p.carrying = null;
        return EVENT_PLACE;
      }
      if (carrying === null) {
        const slot = state.pass.findIndex((s) => s !== null);
        if (slot >= 0) {
          const plated = state.pass[slot];
          state.pass[slot] = null;
          p.carrying = { kind: 'plated', dish: plated.dish, quality: plated.quality };
          return EVENT_PICKUP;
        }
      }
      return 0;
    }

    if (id === 'compost') {
      if (carrying !== null) {
        p.carrying = null;
        return EVENT_PLACE;
      }
      return 0;
    }

    return 0;
  }

  function updateHint() {
    const p = state.player;
    const near = nearestStation(state);
    if (near === null) {
      state.hint = p.carrying === null ? 'WASD move · SPACE use · Q drop · SHIFT dash' : '';
      return;
    }
    const id = near.id;
    const carrying = p.carrying;
    if (id.startsWith('pantry-')) {
      if (carrying !== null) {
        state.hint =
          carrying.kind === 'basket'
            ? `Basket for ${DISHES[carrying.dish].short} — take it to the Mixer`
            : 'Hands full — mix it or drop it (Q)';
        return;
      }
      if (state.orders.length === 0) {
        state.hint = 'No orders yet — wait for the next ticket.';
        return;
      }
      state.hint = `SPACE to grab everything for ${DISHES[state.orders[0].dish].short}`;
      return;
    }
    if (id === 'mixer') {
      const m = state.mixer;
      if (carrying !== null && carrying.kind === 'basket') {
        if (m.mixing !== null) state.hint = 'Mixing…';
        else if (m.ready !== null) state.hint = 'Batter ready — drop the basket first (Q)';
        else if (m.items.length > 0) state.hint = 'Mixer already has ingredients — dump it first.';
        else state.hint = `Basket for ${DISHES[carrying.dish].short} — SPACE to dump it in`;
        return;
      }
      if (m.mixing !== null) state.hint = 'Mixing…';
      else if (m.ready !== null) state.hint = 'Batter ready — SPACE to take';
      else if (m.items.length === 0) state.hint = 'Mixer — add ingredients from the pantry';
      else {
        const dish = exactDish(m.items);
        state.hint = dish !== null ? 'Ready to mix — SPACE to start' : `Mixer: ${m.items.map((i) => INGREDIENTS[i].name).join(', ')}`;
      }
      return;
    }
    if (id === 'oven') {
      const o = state.oven;
      if (o.dish === null) state.hint = carrying !== null && carrying.kind === 'batter' ? 'SPACE to slide the batter in' : 'Oven — empty';
      else if (o.burnt) state.hint = 'Burnt! SPACE to clear it';
      else if (o.t < DISHES[o.dish].bake) state.hint = `Baking… ${Math.max(0, DISHES[o.dish].bake - o.t).toFixed(0)}s to go`;
      else if (o.t <= DISHES[o.dish].bake + OVEN.perfectWindow) state.hint = 'PERFECT — take it out now!';
      else state.hint = 'Take it out before it burns!';
      return;
    }
    if (id === 'frosting') {
      state.hint = state.frosting.done ? 'Frosted — SPACE to take' : state.frosting.dish !== null ? 'Frosting…' : 'Frosting bench — bring a baked cake';
      return;
    }
    if (id === 'decorating') {
      state.hint = state.decorating.done ? 'Decorated — SPACE to take' : state.decorating.dish !== null ? 'Decorating…' : 'Decorating table — bring the cake';
      return;
    }
    if (id === 'plates') {
      state.hint = carrying !== null && carrying.kind === 'finished' ? 'SPACE to plate it' : 'Plates — bring a finished dish';
      return;
    }
    if (id === 'pass') {
      state.hint = carrying !== null && carrying.kind === 'plated' ? 'SPACE to put it on the pass' : 'Serving pass — bring a plated dish';
      return;
    }
    if (id === 'compost') {
      state.hint = carrying !== null ? 'SPACE to throw it away' : 'Compost bin';
    }
  }

  function movePlayer(dt, dx, dy, dash) {
    const p = state.player;
    if (p.dashCd > 0) p.dashCd -= dt;
    let dashed = false;
    if (dash && p.dashCd <= 0) {
      p.dashT = PLAYER.dashTime;
      p.dashCd = PLAYER.dashCooldown;
      dashed = true;
    }
    if (p.dashT > 0) p.dashT -= dt;
    const speed = p.dashT > 0 ? PLAYER.dashSpeed : PLAYER.speed;
    const len = Math.hypot(dx, dy);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    p.moving = len > 0;
    if (nx !== 0) p.dir = nx > 0 ? 1 : -1;
    const r = PLAYER.radius;
    const blocked = (x, y) => {
      if (x < r || x > FIELD.width - r || y < FIELD.hudHeight + r || y > FIELD.height - r) return true;
      for (const rect of SOLID_RECTS) {
        const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
        const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
        if (Math.hypot(x - cx, y - cy) < r) return true;
      }
      return false;
    };
    const tx = p.x + nx * speed * dt;
    if (!blocked(tx, p.y)) p.x = tx;
    const ty = p.y + ny * speed * dt;
    if (!blocked(p.x, ty)) p.y = ty;
    return dashed ? EVENT_DASH : 0;
  }

  function step(dt, input, attract) {
    if (state.over) return 0;
    let events = 0;
    const p = state.player;
    if (state.interactCd > 0) state.interactCd -= dt;

    // The chef moves; the dash is a pulse.
    events |= movePlayer(dt, input.dx, input.dy, input.dash);
    if (input.interact && state.interactCd <= 0) {
      state.interactCd = INTERACT_COOLDOWN;
      events |= tryInteract();
    }
    if (input.drop && p.carrying !== null) {
      state.floor.push({
        kind: p.carrying.kind,
        dish: p.carrying.dish,
        id: p.carrying.id,
        quality: p.carrying.quality,
        x: p.x,
        y: p.y + 24,
      });
      p.carrying = null;
      events |= EVENT_PLACE;
    }

    // The mixer, oven, frosting and decorating benches work on their own clocks.
    const m = state.mixer;
    if (m.mixing !== null) {
      m.mixing += dt / STATION_TIME.mix;
      if (m.mixing >= 1) {
        m.ready = exactDish(m.items);
        m.items = [];
        m.mixing = null;
        events |= EVENT_MIX_DONE;
      }
    }
    const o = state.oven;
    if (o.dish !== null) {
      o.t += dt;
      const dish = DISHES[o.dish];
      if (!o.readyAnnounced && o.t >= dish.bake) {
        o.readyAnnounced = true;
        events |= EVENT_BAKE_READY;
      }
      if (!o.burnt && o.t >= dish.bake + OVEN.burnAfter) {
        o.burnt = true;
        state.burnt += 1;
        events |= EVENT_BURNT;
        events |= loseHeart();
        spawnParticles(704, 120, '#5a5a5a', 16, 60);
      }
    }
    const f = state.frosting;
    if (f.dish !== null && !f.done) {
      f.t += dt / STATION_TIME.frost;
      if (f.t >= 1) {
        f.done = true;
        events |= EVENT_STATION_DONE;
      }
    }
    const d = state.decorating;
    if (d.dish !== null && !d.done) {
      d.t += dt / STATION_TIME.decor;
      if (d.t >= 1) {
        d.done = true;
        events |= EVENT_STATION_DONE;
      }
    }

    // Plated dishes on the pass serve themselves once a matching order is open.
    for (let i = 0; i < state.pass.length; i += 1) {
      const slot = state.pass[i];
      if (slot === null) continue;
      slot.t -= dt;
      if (slot.t <= 0) events |= serveDish(i);
    }

    // The shift clock, the order board and the rush (frozen in attract mode).
    if (!attract) {
      state.time += dt;
      state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);
      if (state.timeLeft <= 0) {
        state.over = true;
        state.overReason = 'time';
        return events | EVENT_OVER;
      }
      state.spawnT -= dt;
      const maxOrders = state.rush.phase === 'active' ? ORDERS.rushMax : ORDERS.max;
      if (state.spawnT <= 0) {
        if (state.orders.length < maxOrders) spawnOrder();
        state.spawnT = state.rush.phase === 'active' ? ORDERS.rushInterval : ORDERS.interval;
      }
      for (let i = state.orders.length - 1; i >= 0; i -= 1) {
        const order = state.orders[i];
        order.left -= dt;
        if (order.left <= 0) {
          state.orders.splice(i, 1);
          addFloat(640, 120, `${order.customer} walked out!`, '#d2452e');
          events |= EVENT_EXPIRED;
          events |= loseHeart();
          if (state.over) return events | EVENT_OVER;
        }
      }
      const rush = state.rush;
      if (rush.index < RUSH.at.length) {
        const at = RUSH.at[rush.index];
        if (rush.phase === 'idle' && state.time >= at - RUSH.warn) {
          rush.phase = 'warn';
          rush.t = RUSH.warn;
        } else if (rush.phase === 'warn') {
          rush.t -= dt;
          if (rush.t <= 0) {
            rush.phase = 'active';
            rush.t = RUSH.length;
            events |= EVENT_RUSH;
          }
        } else if (rush.phase === 'active') {
          rush.t -= dt;
          if (rush.t <= 0) {
            rush.phase = 'idle';
            rush.index += 1;
          }
        }
      }
    } else {
      // Attract mode: keep a few orders on the board and never punish anyone.
      state.spawnT -= dt;
      if (state.spawnT <= 0) {
        if (state.orders.length < 3) spawnOrder();
        state.spawnT = ORDERS.interval;
      }
    }

    // Cosmetics: particles fall, floating texts rise.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.t += dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 120 * dt;
      if (pt.t >= pt.life) state.particles.splice(i, 1);
    }
    for (let i = state.floats.length - 1; i >= 0; i -= 1) {
      const fl = state.floats[i];
      fl.t += dt;
      fl.y -= 28 * dt;
      if (fl.t >= fl.life) state.floats.splice(i, 1);
    }

    updateHint();
    return events;
  }

  function reset() {
    state = freshState();
  }

  reset();

  return {
    get state() {
      return state;
    },
    reset,
    step,
    /** The pay multiplier for the next serve, from the current combo. */
    payMultiplier,
  };
}
