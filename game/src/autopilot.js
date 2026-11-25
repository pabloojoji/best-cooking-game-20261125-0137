// The autopilot plays the real rules forward: it works the earliest order's
// dish through the kitchen — pantry, mixer, oven, frosting, decorating, plates,
// pass — and serves it. Screenshot scenes run it from a fresh world, so every
// frame is what a short game really looks like. It never cheats: it steers the
// chef and presses interact like a player would.
//
// Its priorities, every step: a ready oven first (a dish burns four seconds
// after its golden window), then whatever the chef is carrying, then anything
// ready to take, then the next dish. While a dish bakes it gathers the next
// dish's ingredients, but it is back at the oven before the bake finishes.

import { DISHES, DISH_IDS, nextStep } from './recipes.js';
import { PANTRY_BINS, STATION_FRONT, STATION_RECTS, nearestStation, pantryFront } from './world.js';

/** The dish whose ingredient list exactly matches `items`, or null. */
function exactDish(items) {
  return DISH_IDS.find((id) => {
    const want = DISHES[id].ingredients;
    return want.length === items.length && want.every((ing) => items.includes(ing));
  }) ?? null;
}

/** The open floor, where the chef sets things down (no station in reach). */
const OPEN_FLOOR = { x: 640, y: 560 };

/** The distance from a point to a rectangle, 0 when the point is inside it. */
function distToRect(px, py, r) {
  const cx = Math.max(r.x, Math.min(px, r.x + r.w));
  const cy = Math.max(r.y, Math.min(py, r.y + r.h));
  return Math.hypot(px - cx, py - cy);
}

/** How many copies of `dish` are already in the kitchen (carried, in a station, on the pass or on the floor). */
function inFlight(state, dish) {
  let n = 0;
  const c = state.player.carrying;
  if (c !== null && c.dish === dish) n += 1;
  if (state.mixer.ready === dish) n += 1;
  else if (state.mixer.items.length > 0 && exactDish(state.mixer.items) === dish) n += 1;
  if (state.oven.dish === dish) n += 1;
  if (state.frosting.dish === dish) n += 1;
  if (state.decorating.dish === dish) n += 1;
  for (const s of state.pass) if (s !== null && s.dish === dish) n += 1;
  for (const f of state.floor) if (f.dish === dish && f.kind !== 'ingredient') n += 1;
  return n;
}

/** A spot to set something down: the chef's own spot when the item would land clear of every station, else the nearer of the two open-floor spots. */
function dropPoint(state) {
  const p = state.player;
  const ix = p.x;
  const iy = p.y + 24;
  let clear = true;
  for (const bin of PANTRY_BINS) {
    if (distToRect(ix, iy, bin) < 80) {
      clear = false;
      break;
    }
  }
  if (clear) {
    for (const rect of Object.values(STATION_RECTS)) {
      if (distToRect(ix, iy, rect) < 80) {
        clear = false;
        break;
      }
    }
  }
  if (clear) return { x: p.x, y: p.y };
  const mid = { x: 640, y: 260 };
  const dMid = Math.hypot(mid.x - p.x, mid.y - p.y);
  const dFloor = Math.hypot(OPEN_FLOOR.x - p.x, OPEN_FLOOR.y - p.y);
  return dMid <= dFloor ? mid : OPEN_FLOOR;
}

/** The central island the chef must walk around, not through. */
const ISLAND = { x: 512, y: 332, w: 256, h: 128 };
/** Clearance around the island when testing a route (chef radius 15 + margin). */
const ISLAND_MARGIN = 24;

/** Four corridor waypoints, one on each side of the island, in open floor. */
const WAYPOINTS = [
  { x: 400, y: 300 },
  { x: 880, y: 300 },
  { x: 400, y: 500 },
  { x: 880, y: 500 },
];

/** Whether two line segments intersect (collinear overlaps do not count). */
function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (d === 0) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/** Whether the straight line from `from` to `to` would cross the island. */
function routeCrossesIsland(from, to) {
  const m = ISLAND_MARGIN;
  const x0 = ISLAND.x - m;
  const y0 = ISLAND.y - m;
  const x1 = ISLAND.x + ISLAND.w + m;
  const y1 = ISLAND.y + ISLAND.h + m;
  const inside = (p) => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1;
  if (inside(from) || inside(to)) return true;
  return (
    segmentsCross(from.x, from.y, to.x, to.y, x0, y0, x1, y0) ||
    segmentsCross(from.x, from.y, to.x, to.y, x1, y0, x1, y1) ||
    segmentsCross(from.x, from.y, to.x, to.y, x1, y1, x0, y1) ||
    segmentsCross(from.x, from.y, to.x, to.y, x0, y1, x0, y0)
  );
}

/**
 * The point to steer toward: the goal itself when the straight line is clear,
 * else the corridor waypoint that is reachable and leads most directly on.
 * Recomputed every step, so the route chains around the island's corners.
 */
function routeTarget(from, to) {
  if (!routeCrossesIsland(from, to)) return to;
  let best = null;
  let bestScore = Infinity;
  for (const w of WAYPOINTS) {
    if (routeCrossesIsland(from, w)) continue;
    const penalty = routeCrossesIsland(w, to) ? 10000 : 0;
    const score =
      penalty + Math.hypot(w.x - to.x, w.y - to.y) + Math.hypot(w.x - from.x, w.y - from.y) * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return best ?? to;
}

export function createAutopilot() {
  let stuckT = 0;
  let prevPos = null;
  let detour = 0;
  let detourT = 0;
  let lastGoalKey = '';
  let lastGoal = null;

  function decide(state) {
    const p = state.player;
    const carrying = p.carrying;
    const oven = state.oven;
    const ovenReady = oven.dish !== null && oven.t >= DISHES[oven.dish].bake;
    const ovenBaking = oven.dish !== null && !ovenReady;

    // Burnt food goes straight to the compost.
    if (carrying !== null && carrying.kind === 'burnt') {
      return { point: STATION_FRONT.compost, station: 'compost' };
    }

    // A ready oven waits for no one: set down what is carried and take the dish out.
    if (ovenReady && carrying !== null && (carrying.kind === 'basket' || carrying.kind === 'ingredient')) {
      return { point: dropPoint(state), station: null, drop: true };
    }

    // A plated dish goes to the pass when its order is open. When its order
    // is gone (served by another copy, or expired), the dish is dead: compost
    // it at once instead of standing at the open floor holding it forever.
    if (carrying !== null && carrying.kind === 'plated') {
      const open = state.orders.some((o) => o.dish === carrying.dish);
      if (open) return { point: STATION_FRONT.pass, station: 'pass' };
      return { point: STATION_FRONT.compost, station: 'compost' };
    }

    // A finished dish goes to the plates — unless its order is already gone,
    // in which case it is dead weight: compost it.
    if (carrying !== null && carrying.kind === 'finished') {
      const open = state.orders.some((o) => o.dish === carrying.dish);
      if (open) return { point: STATION_FRONT.plates, station: 'plates' };
      return { point: STATION_FRONT.compost, station: 'compost' };
    }

    // An item mid-chain goes to its next station; wait nearby while it is busy.
    // A mid-chain item whose order is already gone is dead weight: compost it.
    if (carrying !== null && (carrying.kind === 'batter' || carrying.kind === 'baked' || carrying.kind === 'frosted')) {
      const open = state.orders.some((o) => o.dish === carrying.dish);
      if (!open) return { point: STATION_FRONT.compost, station: 'compost' };
      const step = nextStep(carrying.dish, carrying.kind);
      if (step === 'oven') {
        if (oven.dish !== null) return { point: { x: 704, y: 240 }, station: null };
        return { point: STATION_FRONT.oven, station: 'oven' };
      }
      if (step === 'frosting') {
        if (state.frosting.dish !== null) return { point: { x: 896, y: 240 }, station: null };
        return { point: STATION_FRONT.frosting, station: 'frosting' };
      }
      if (step === 'decorating') {
        if (state.decorating.dish !== null) return { point: { x: 1088, y: 240 }, station: null };
        return { point: STATION_FRONT.decorating, station: 'decorating' };
      }
      return { point: STATION_FRONT.plates, station: 'plates' };
    }

    // A basket goes to the mixer when it is free. The oven comes first: a
    // dish ready (or nearly) is dropped off for, not waited on. A batter that
    // is already waiting comes next: set the basket down and take the batter.
    // A mixer that still holds ingredients is emptied before the basket goes in.
    if (carrying !== null && carrying.kind === 'basket') {
      if (ovenReady || (ovenBaking && oven.t >= DISHES[oven.dish].bake - 2)) {
        return { point: dropPoint(state), station: null, drop: true };
      }
      if (state.mixer.ready !== null) {
        return { point: dropPoint(state), station: null, drop: true };
      }
      if (state.mixer.mixing !== null) {
        return { point: { x: 512, y: 240 }, station: null };
      }
      if (state.mixer.items.length > 0) {
        return { point: dropPoint(state), station: null, drop: true };
      }
      return { point: STATION_FRONT.mixer, station: 'mixer' };
    }

    // Empty hands: first take anything ready, then start the next dish.
    if (ovenReady) return { point: STATION_FRONT.oven, station: 'oven' };
    if (state.frosting.done) return { point: STATION_FRONT.frosting, station: 'frosting' };
    if (state.decorating.done) return { point: STATION_FRONT.decorating, station: 'decorating' };
    if (state.mixer.ready !== null) {
      if (oven.dish === null) return { point: STATION_FRONT.mixer, station: 'mixer' };
      return { point: { x: 704, y: 240 }, station: null };
    }
    if (state.mixer.mixing === null && state.mixer.items.length > 0 && exactDish(state.mixer.items) !== null) {
      return { point: STATION_FRONT.mixer, station: 'mixer' };
    }
    // A mixer holding ingredients that make no dish is dumped, empty-handed.
    if (state.mixer.mixing === null && state.mixer.items.length > 0) {
      return { point: STATION_FRONT.mixer, station: 'mixer' };
    }

    // A dish is baking and nearly done: get back to the oven instead of wandering off.
    if (ovenBaking && oven.t >= DISHES[oven.dish].bake - 2) {
      return { point: STATION_FRONT.oven, station: null };
    }

    // A basket left on the floor is picked back up before a fresh one.
    const dropped = state.floor.find((f) => f.kind === 'basket');
    if (dropped !== undefined) return { point: { x: dropped.x, y: dropped.y }, station: 'floor' };

    // Work the earliest order: one trip to the pantry grabs the whole
    // basket. Any bin hands out the same basket, so take the nearest one.
    // A dish with a copy already in the kitchen is not started twice: the
    // chef waits by the oven (or the middle of the kitchen) until it is served.
    if (state.orders.length > 0) {
      const dish = state.orders[0].dish;
      const openCount = state.orders.filter((o) => o.dish === dish).length;
      if (inFlight(state, dish) >= openCount) {
        if (ovenBaking) return { point: STATION_FRONT.oven, station: null };
        return { point: { x: 640, y: 300 }, station: null };
      }
      let bestBin = 0;
      let bestDist = Infinity;
      for (let i = 0; i < PANTRY_BINS.length; i += 1) {
        const front = pantryFront(i);
        const d = Math.hypot(front.x - p.x, front.y - p.y);
        if (d < bestDist) {
          bestDist = d;
          bestBin = i;
        }
      }
      return { point: pantryFront(bestBin), station: `pantry-${PANTRY_BINS[bestBin].id}` };
    }

    // Nothing to do: wait by the pass.
    return { point: OPEN_FLOOR, station: null };
  }

  /** The input for one fixed step: steering, an interact pulse, and a dash. */
  function input(state, dt) {
    const p = state.player;
    const goal = decide(state);
    lastGoal = goal;
    const goalKey = `${goal.point.x},${goal.point.y},${goal.station ?? ''},${goal.drop === true ? 'drop' : ''}`;

    // A new goal resets the stuck tracking: a fresh target is not a blockage.
    if (goalKey !== lastGoalKey) {
      lastGoalKey = goalKey;
      stuckT = 0;
      detour = 0;
      detourT = 0;
    }

    // Steer toward the routed target: the goal itself when the straight line
    // is clear, else a corridor waypoint around the central island.
    const target = routeTarget(p, goal.point);
    const gdx = target.x - p.x;
    const gdy = target.y - p.y;
    const gdist = Math.hypot(gdx, gdy);
    const goalDist = Math.hypot(goal.point.x - p.x, goal.point.y - p.y);

    // A drop happens only once the chef has reached the open floor itself,
    // not a waypoint on the way there.
    if (goal.drop === true) {
      if (goalDist < 12) return { dx: 0, dy: 0, interact: false, dash: false, drop: true };
      const len = gdist || 1;
      return { dx: gdx / len, dy: gdy / len, interact: false, dash: false, drop: false };
    }

    // Stuck means trying to move and barely moving: sidestep around the counter.
    const moved = prevPos === null ? 99 : Math.hypot(p.x - prevPos.x, p.y - prevPos.y);
    prevPos = { x: p.x, y: p.y };
    if (detourT > 0) {
      detourT -= dt;
    } else if (gdist > 12 && moved < 0.5) {
      stuckT += dt;
      if (stuckT > 0.6) {
        detour = detour === 0 ? 1 : -detour;
        detourT = 0.8;
        stuckT = 0;
      }
    } else {
      stuckT = 0;
    }

    let mx = gdist > 0 ? gdx / gdist : 0;
    let my = gdist > 0 ? gdy / gdist : 0;
    if (detourT > 0 && detour !== 0) {
      const px = -my * detour;
      const py = mx * detour;
      mx += px * 0.9;
      my += py * 0.9;
      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;
    }

    // Press interact only when the goal station is the one the world would
    // actually use: the world answers the NEAREST station in reach, and the
    // pantry bins sit side by side, so a pulse aimed at one bin would
    // otherwise pick up the next bin's ingredient, dump the mixer, or
    // compost a good ingredient. When another station is nearer, just keep
    // walking toward the goal's front: the goal becomes nearest there.
    let interact = false;
    if (goal.station !== null && goal.station !== 'floor') {
      const near = nearestStation(state);
      if (near !== null && near.id === goal.station) interact = true;
    } else if (goal.station === 'floor') {
      if (gdist < 30) interact = true;
    }

    const dash = gdist > 220 && p.dashCd <= 0;
    return { dx: gdist < 8 ? 0 : mx, dy: gdist < 8 ? 0 : my, interact, dash, drop: false };
  }

  return { input, get lastGoal() { return lastGoal; } };
}
