// All the drawing: the kitchen, the food, the chef, the order board, the HUD
// and the screens. Every picture in the game is drawn here in canvas code —
// no image files, no fonts to load, nothing over the network.

import { FIELD, PALETTE } from './config.js';
import { DISHES, INGREDIENTS, recipeText } from './recipes.js';
import { PANTRY_BINS, STATION_RECTS, nearestStation } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The order tickets' size on the board. */
const TICKET = { w: 164, h: 64, gap: 6 };

/** Short forms for the pantry labels that would not fit their 64 px bins. */
const PANTRY_LABEL = { chocolate: 'CHOCO', strawberry: 'STRAWBY' };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** One ingredient's little picture, centred on (x, y) at size `s`. */
export function drawIngredientIcon(ctx, id, x, y, s) {
  const c = INGREDIENTS[id].color;
  const d = INGREDIENTS[id].dark;
  ctx.save();
  ctx.translate(x, y);
  if (id === 'flour') {
    ctx.fillStyle = '#e8dcc0';
    roundRect(ctx, -s * 0.42, -s * 0.3, s * 0.84, s * 0.72, s * 0.12);
    ctx.fill();
    ctx.fillStyle = '#cbb98f';
    ctx.fillRect(-s * 0.2, -s * 0.48, s * 0.4, s * 0.22);
    ctx.fillStyle = '#fdf3c4';
    ctx.font = `700 ${Math.round(s * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', 0, s * 0.08);
  } else if (id === 'egg') {
    ctx.fillStyle = '#fff6e0';
    ellipse(ctx, 0, 0, s * 0.36, s * 0.46);
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(0, s * 0.06, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'butter') {
    ctx.fillStyle = '#f6d54b';
    roundRect(ctx, -s * 0.44, -s * 0.3, s * 0.88, s * 0.6, s * 0.1);
    ctx.fill();
    ctx.fillStyle = '#fbf3c0';
    ctx.fillRect(-s * 0.44, -s * 0.3, s * 0.88, s * 0.18);
    ctx.strokeStyle = '#d9a91e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-s * 0.44, -s * 0.3, s * 0.88, s * 0.6);
  } else if (id === 'chocolate') {
    ctx.fillStyle = '#5b2a1e';
    roundRect(ctx, -s * 0.44, -s * 0.32, s * 0.88, s * 0.64, s * 0.08);
    ctx.fill();
    ctx.fillStyle = '#7d4a32';
    ctx.fillRect(-s * 0.44, -s * 0.32, s * 0.42, s * 0.28);
    ctx.fillRect(s * 0.02, s * 0.04, s * 0.42, s * 0.28);
    ctx.fillStyle = '#3d1a12';
    ctx.fillRect(-s * 0.02, -s * 0.32, s * 0.04, s * 0.64);
    ctx.fillRect(-s * 0.44, -s * 0.02, s * 0.88, s * 0.04);
  } else if (id === 'strawberry') {
    ctx.fillStyle = '#e2546e';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.42);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.05, -s * 0.34, -s * 0.46, 0, -s * 0.2);
    ctx.bezierCurveTo(s * 0.34, -s * 0.46, s * 0.5, -s * 0.05, 0, s * 0.42);
    ctx.fill();
    ctx.fillStyle = '#3ecf8e';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(-s * 0.22, -s * 0.42);
    ctx.lineTo(0, -s * 0.3);
    ctx.lineTo(s * 0.22, -s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fdf3c4';
    ctx.fillRect(-s * 0.14, -s * 0.02, s * 0.05, s * 0.05);
    ctx.fillRect(s * 0.08, s * 0.12, s * 0.05, s * 0.05);
  } else if (id === 'cream') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.3, Math.PI * 0.9, Math.PI * 2.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.14, Math.PI * 0.9, Math.PI * 2.2);
    ctx.stroke();
    ctx.fillStyle = '#e8d9c0';
    ellipse(ctx, 0, s * 0.36, s * 0.34, s * 0.1);
    ctx.fill();
  }
  ctx.restore();
}

/** A basket holding one dish's ingredients, for the overhead bubble. */
function drawBasketIcon(ctx, dishId, x, y) {
  const ings = DISHES[dishId].ingredients;
  // The ingredient dots, in a row above the rim.
  const startX = x - ((ings.length - 1) * 7);
  ings.forEach((ing, i) => {
    ctx.fillStyle = INGREDIENTS[ing].color;
    ctx.beginPath();
    ctx.arc(startX + i * 14, y - 6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,58,74,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  // The basket: a woven bowl with a rim.
  ctx.fillStyle = '#a06a35';
  ctx.beginPath();
  ctx.arc(x, y + 2, 13, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7d4f24';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c98f4e';
  ctx.fillRect(x - 14, y - 1, 28, 4);
  ctx.strokeStyle = 'rgba(247,234,215,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 6);
  ctx.lineTo(x + 9, y + 6);
  ctx.moveTo(x - 6, y + 11);
  ctx.lineTo(x + 6, y + 11);
  ctx.stroke();
}

/** One dish's little picture, on a plate, centred on (x, y) at size `s`. */
export function drawDishIcon(ctx, dishId, x, y, s, quality = 'ok') {
  const dish = DISHES[dishId];
  ctx.save();
  ctx.translate(x, y);
  // The plate.
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, 0, s * 0.08, s * 0.52, s * 0.4);
  ctx.fill();
  ctx.strokeStyle = '#8ecae6';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // The cake.
  ctx.fillStyle = dish.body;
  ellipse(ctx, 0, -s * 0.02, s * 0.38, s * 0.3);
  ctx.fill();
  ctx.fillStyle = dish.top;
  ellipse(ctx, 0, -s * 0.1, s * 0.3, s * 0.2);
  ctx.fill();
  // The topping, one per dish so the board reads at a glance.
  if (dishId === 'torte') {
    ctx.strokeStyle = dish.accent;
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.12);
    ctx.quadraticCurveTo(0, -s * 0.02, s * 0.2, -s * 0.12);
    ctx.stroke();
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(0, -s * 0.22, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (dishId === 'shortcake') {
    drawIngredientIcon(ctx, 'strawberry', 0, -s * 0.2, s * 0.55);
  } else if (dishId === 'lemon') {
    ctx.fillStyle = '#f6d54b';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.28);
    ctx.lineTo(s * 0.18, -s * 0.08);
    ctx.lineTo(-s * 0.18, -s * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (dishId === 'mousse') {
    ctx.fillStyle = dish.accent;
    ctx.beginPath();
    ctx.arc(s * 0.12, -s * 0.2, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3ecf8e';
    ctx.fillRect(-s * 0.05, -s * 0.3, s * 0.16, s * 0.05);
  } else if (dishId === 'bun') {
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.arc(0, -s * 0.08, s * 0.2, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -s * 0.08, s * 0.1, 0, Math.PI * 1.5);
    ctx.stroke();
  } else if (dishId === 'brulee') {
    // A vanilla pudding wears a cherry on top.
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(0, -s * 0.18, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3ecf8e';
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.26);
    ctx.quadraticCurveTo(s * 0.06, -s * 0.32, s * 0.1, -s * 0.28);
    ctx.stroke();
  }
  // A perfect bake gets a gold star.
  if (quality === 'perfect') {
    ctx.fillStyle = '#ffc93c';
    ctx.font = `700 ${Math.round(s * 0.34)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', s * 0.4, -s * 0.34);
  }
  ctx.restore();
}

/** A thin progress bar, optionally with a golden zone marked on it. */
function progressBar(ctx, x, y, w, h, frac, color, golden = null) {
  ctx.fillStyle = 'rgba(43,58,74,0.85)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (golden !== null) {
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(x + w * golden[0], y + 1, w * (golden[1] - golden[0]), h - 2);
  }
  if (frac > 0) {
    ctx.fillStyle = color;
    const fw = Math.max(h, w * Math.min(1, frac));
    roundRect(ctx, x, y, fw, h, h / 2);
    ctx.fill();
  }
}

function stationLabel(ctx, text, x, y) {
  // A dark outline keeps the label readable on any background behind it
  // (the mixer's white bowl sits right where its label goes).
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try {
    ctx.letterSpacing = '1px';
  } catch {
    // Older canvas: letter spacing is garnish.
  }
  ctx.strokeStyle = 'rgba(43,58,74,0.85)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fdf3c4';
  ctx.fillText(text, x, y);
  try {
    ctx.letterSpacing = '0px';
  } catch {
    // Ignore.
  }
}

function counterBase(ctx, rect, top) {
  ctx.fillStyle = PALETTE.counterFront;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.fillStyle = top;
  roundRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h * 0.42, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.counterEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor() {
    ctx.fillStyle = PALETTE.floorA;
    ctx.fillRect(0, FIELD.hudHeight, FIELD.width, FIELD.height - FIELD.hudHeight);
    const tile = 64;
    ctx.fillStyle = PALETTE.floorB;
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 20; col += 1) {
        if ((row + col) % 2 === 0) continue;
        ctx.fillRect(col * tile, FIELD.hudHeight + row * tile, tile, tile);
      }
    }
    // A sunny rug under the island, where the chef paces all day.
    ctx.fillStyle = 'rgba(255,107,157,0.16)';
    roundRect(ctx, 470, 300, 340, 200, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,107,157,0.35)';
    ctx.lineWidth = 3;
    roundRect(ctx, 482, 312, 316, 176, 12);
    ctx.stroke();
  }

  function drawCounters() {
    // Filler counters along the top wall.
    for (const x of [384, 576, 768, 960, 1152]) {
      counterBase(ctx, { x, y: 76, w: 64, h: 64 }, PALETTE.counterTop);
    }
    // The island, with a board and bowls.
    counterBase(ctx, { x: 512, y: 332, w: 256, h: 128 }, PALETTE.counterTop);
    ctx.fillStyle = '#ffe9a8';
    roundRect(ctx, 560, 372, 90, 48, 6);
    ctx.fill();
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(700, 392, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(700, 392, 8, 0, Math.PI * 2);
    ctx.fill();
    // Side counters with jars.
    counterBase(ctx, { x: 0, y: 332, w: 64, h: 256 }, PALETTE.counterTop);
    counterBase(ctx, { x: 1216, y: 332, w: 64, h: 256 }, PALETTE.counterTop);
    for (const y of [360, 420, 480, 540]) {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 18, y, 28, 34, 5);
      ctx.fill();
      ctx.fillStyle = '#ff6b9d';
      ctx.fillRect(18, y, 28, 8);
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, 1234, y, 28, 34, 5);
      ctx.fill();
      ctx.fillStyle = '#3ecf8e';
      ctx.fillRect(1234, y, 28, 8);
    }
    // Bottom decorative counters.
    counterBase(ctx, { x: 0, y: 656, w: 448, h: 60 }, PALETTE.counterTop);
    counterBase(ctx, { x: 1024, y: 656, w: 256, h: 60 }, PALETTE.counterTop);
    counterBase(ctx, { x: 832, y: 656, w: 64, h: 60 }, PALETTE.counterTop);
  }

  function drawPantry(state) {
    const near = nearestStation(state);
    for (const bin of PANTRY_BINS) {
      const active = near !== null && near.id === `pantry-${bin.id}`;
      counterBase(ctx, bin, active ? '#ffd94d' : PALETTE.counterTop);
      drawIngredientIcon(ctx, bin.id, bin.x + 32, bin.y + 26, 30);
      ctx.fillStyle = active ? '#2b3a4a' : '#fdf3c4';
      // The bins are 64 px wide with no gap, so the long names overflow into
      // their neighbours: shorten them, and shrink the font if a label would
      // still run past its own bin.
      const label = (PANTRY_LABEL[bin.id] ?? INGREDIENTS[bin.id].name).toUpperCase();
      ctx.font = '700 10px system-ui, sans-serif';
      if (ctx.measureText(label).width > 58) ctx.font = '700 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bin.x + 32, bin.y + 53);
      if (active) {
        ctx.strokeStyle = '#ffc93c';
        ctx.lineWidth = 3;
        roundRect(ctx, bin.x + 1, bin.y + 1, bin.w - 2, bin.h - 2, 8);
        ctx.stroke();
      }
    }
  }

  function drawMixer(state) {
    const rect = STATION_RECTS.mixer;
    const near = nearestStation(state);
    const active = near !== null && near.id === 'mixer';
    counterBase(ctx, rect, active ? '#ffd94d' : PALETTE.counterTop);
    const cx = rect.x + 64;
    const cy = rect.y + 28;
    // The bowl, with what is in it.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8ecae6';
    ctx.lineWidth = 2;
    ctx.stroke();
    const m = state.mixer;
    if (m.ready !== null) {
      ctx.fillStyle = '#e8c08a';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 16, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    } else if (m.items.length > 0) {
      m.items.forEach((ing, i) => {
        ctx.fillStyle = INGREDIENTS[ing].color;
        ctx.beginPath();
        ctx.arc(cx - 12 + i * 12, cy - 6, 6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // The whisk.
    ctx.strokeStyle = '#8b93a3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 24, cy - 18);
    ctx.lineTo(cx + 34, cy - 34);
    ctx.stroke();
    if (m.mixing !== null) {
      progressBar(ctx, rect.x + 14, rect.y + 52, rect.w - 28, 8, m.mixing, '#3ecf8e');
    }
    stationLabel(ctx, 'MIXER', cx, rect.y + 44);
    if (active) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 8);
      ctx.stroke();
    }
  }

  function drawOven(state) {
    const rect = STATION_RECTS.oven;
    const near = nearestStation(state);
    const active = near !== null && near.id === 'oven';
    counterBase(ctx, rect, active ? '#ffd94d' : PALETTE.counterTop);
    const o = state.oven;
    const cx = rect.x + 64;
    const cy = rect.y + 26;
    ctx.fillStyle = '#2b3a4a';
    roundRect(ctx, cx - 34, cy - 16, 68, 34, 6);
    ctx.fill();
    if (o.dish !== null) {
      const dish = DISHES[o.dish];
      let glow = '#e8873a';
      if (o.burnt) glow = '#3a3a3a';
      else if (o.t >= dish.bake) glow = '#ffc93c';
      ctx.fillStyle = glow;
      roundRect(ctx, cx - 28, cy - 10, 56, 22, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(cx - 28, cy - 10, 56, 6);
      if (o.burnt) {
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.arc(cx - 10, cy - 24, 7, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy - 28, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      const golden = [dish.bake / (dish.bake + 4), (dish.bake + 1.5) / (dish.bake + 4)];
      progressBar(ctx, rect.x + 14, rect.y + 52, rect.w - 28, 8, Math.min(1, o.t / (dish.bake + 4)), o.burnt ? '#ff5a5a' : '#e8873a', golden);
    } else {
      ctx.fillStyle = 'rgba(247,234,215,0.25)';
      roundRect(ctx, cx - 28, cy - 10, 56, 22, 4);
      ctx.fill();
    }
    stationLabel(ctx, 'OVEN', cx, rect.y + 44);
    if (active) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 8);
      ctx.stroke();
    }
  }

  function drawBench(state, id, label, icon) {
    const rect = STATION_RECTS[id];
    const near = nearestStation(state);
    const active = near !== null && near.id === id;
    counterBase(ctx, rect, active ? '#ffd94d' : PALETTE.counterTop);
    const cx = rect.x + 64;
    const cy = rect.y + 28;
    const st = state[id];
    if (st.dish !== null) {
      if (id === 'frosting') {
        drawDishIcon(ctx, st.dish, cx, cy, 44, st.quality);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + 14, cy - 12, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawDishIcon(ctx, st.dish, cx, cy, 44, st.quality);
        ctx.fillStyle = '#ffc93c';
        ctx.font = '700 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', cx + 16, cy - 14);
      }
      if (!st.done) progressBar(ctx, rect.x + 14, rect.y + 52, rect.w - 28, 8, st.t, '#ff6b9d');
    } else {
      ctx.fillStyle = 'rgba(43,58,74,0.35)';
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, cx, cy);
    }
    stationLabel(ctx, label, cx, rect.y + 44);
    if (active) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 8);
      ctx.stroke();
    }
  }

  function drawPlates(state) {
    const rect = STATION_RECTS.plates;
    const near = nearestStation(state);
    const active = near !== null && near.id === 'plates';
    counterBase(ctx, rect, active ? '#ffd94d' : PALETTE.counterTop);
    const cx = rect.x + 32;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === 0 ? '#ffffff' : '#efe3cc';
      ellipse(ctx, cx, rect.y + 22 + i * 7, 20, 6);
      ctx.fill();
      ctx.strokeStyle = '#8ecae6';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    stationLabel(ctx, 'PLATES', cx, rect.y + 52);
    if (active) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 8);
      ctx.stroke();
    }
  }

  function drawPass(state) {
    const rect = STATION_RECTS.pass;
    const near = nearestStation(state);
    const active = near !== null && near.id === 'pass';
    counterBase(ctx, rect, active ? '#ffd94d' : PALETTE.counterTop);
    // The service bell.
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.arc(rect.x + 28, rect.y + 22, 12, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0a500';
    ctx.fillRect(rect.x + 14, rect.y + 22, 28, 4);
    // Plated dishes waiting on the pass.
    state.pass.forEach((slot, i) => {
      if (slot === null) return;
      drawDishIcon(ctx, slot.dish, rect.x + 90 + i * 110, rect.y + 28, 52, slot.quality);
      if (slot.t > 0) {
        ctx.fillStyle = '#ff6b9d';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DING!', rect.x + 90 + i * 110, rect.y + 52);
      }
    });
    stationLabel(ctx, 'SERVING PASS', rect.x + rect.w / 2, rect.y + 50);
    if (active) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 8);
      ctx.stroke();
    }
  }

  function drawCompost(state) {
    const rect = STATION_RECTS.compost;
    const near = nearestStation(state);
    const active = near !== null && near.id === 'compost';
    counterBase(ctx, rect, active ? '#ffd94d' : PALETTE.counterTop);
    const cx = rect.x + 64;
    ctx.fillStyle = '#3ecf8e';
    roundRect(ctx, cx - 22, rect.y + 12, 44, 34, 6);
    ctx.fill();
    ctx.fillStyle = '#3a7a3e';
    roundRect(ctx, cx - 26, rect.y + 8, 52, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#fdf3c4';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♻', cx, rect.y + 30);
    stationLabel(ctx, 'COMPOST', cx, rect.y + 52);
    if (active) {
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 3;
      roundRect(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 8);
      ctx.stroke();
    }
  }

  function drawFloorItems(state) {
    for (const item of state.floor) {
      ctx.fillStyle = 'rgba(43,58,74,0.15)';
      ellipse(ctx, item.x, item.y + 10, 16, 5);
      ctx.fill();
      if (item.kind === 'ingredient') drawIngredientIcon(ctx, item.id, item.x, item.y, 30);
      else if (item.kind === 'burnt') {
        ctx.fillStyle = '#3a3a3a';
        ellipse(ctx, item.x, item.y, 14, 10);
        ctx.fill();
      } else {
        drawDishIcon(ctx, item.dish, item.x, item.y, 40, item.quality);
      }
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    ctx.fillStyle = 'rgba(43,58,74,0.25)';
    ellipse(ctx, p.x, p.y + 14, 16, 6);
    ctx.fill();
    // The chef: a friendly smile, a bright candy-pink apron with a sunny
    // bib and a mint star, and a sky-blue hat. The shape and size never
    // change, so the movement and collision stay exactly as they were.
    ctx.fillStyle = '#ff6b9d';
    roundRect(ctx, p.x - 13, p.y - 2, 26, 20, 8);
    ctx.fill();
    ctx.fillStyle = '#ffc93c';
    roundRect(ctx, p.x - 11, p.y - 2, 22, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#3ecf8e';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', p.x, p.y + 11);
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 12, 11, 0, Math.PI * 2);
    ctx.fill();
    // Rosy cheeks.
    ctx.fillStyle = 'rgba(255,107,157,0.55)';
    ctx.beginPath();
    ctx.arc(p.x - 7, p.y - 9, 2.6, 0, Math.PI * 2);
    ctx.arc(p.x + 7, p.y - 9, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // The hat: sky-blue puffs with a white band.
    ctx.fillStyle = '#8ecae6';
    ctx.beginPath();
    ctx.arc(p.x - 7, p.y - 24, 7, 0, Math.PI * 2);
    ctx.arc(p.x, p.y - 27, 8, 0, Math.PI * 2);
    ctx.arc(p.x + 7, p.y - 24, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x - 12, p.y - 22, 24, 4);
    // Big happy eyes and a wide smile.
    ctx.fillStyle = '#2b3a4a';
    ctx.beginPath();
    ctx.arc(p.x - 4 * p.dir, p.y - 14, 2, 0, Math.PI * 2);
    ctx.arc(p.x + 4 * p.dir, p.y - 14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b3a4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 10, 5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    if (p.dashT > 0) {
      ctx.strokeStyle = 'rgba(255,201,60,0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(p.x - p.dir * (18 + i * 6), p.y - 8 + i * 7);
        ctx.lineTo(p.x - p.dir * (28 + i * 6), p.y - 8 + i * 7);
        ctx.stroke();
      }
    }
    // What the chef is carrying, in a little bubble overhead.
    const c = p.carrying;
    if (c !== null) {
      ctx.fillStyle = 'rgba(255,246,227,0.95)';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 48, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8ecae6';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (c.kind === 'ingredient') drawIngredientIcon(ctx, c.id, p.x, p.y - 48, 26);
      else if (c.kind === 'basket') drawBasketIcon(ctx, c.dish, p.x, p.y - 48);
      else if (c.kind === 'burnt') {
        ctx.fillStyle = '#3a3a3a';
        ellipse(ctx, p.x, p.y - 48, 11, 8);
        ctx.fill();
      } else if (c.kind === 'batter') {
        ctx.fillStyle = '#e8c08a';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 48, 11, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c98f4e';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        drawDishIcon(ctx, c.dish, p.x, p.y - 48, 30, c.quality);
      }
    }
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, 1 - pt.t / pt.life);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats(state) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const fl of state.floats) {
      ctx.globalAlpha = Math.max(0, 1 - fl.t / fl.life);
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawOrders(state) {
    const boardX = 178;
    const boardY = 6;
    state.orders.forEach((order, i) => {
      const x = boardX + i * (TICKET.w + TICKET.gap);
      const y = boardY;
      ctx.fillStyle = order.vip ? '#fff3c0' : PALETTE.panel;
      roundRect(ctx, x, y, TICKET.w, TICKET.h, 8);
      ctx.fill();
      ctx.strokeStyle = order.vip ? '#ffc93c' : PALETTE.panelEdge;
      ctx.lineWidth = order.vip ? 3 : 2;
      ctx.stroke();
      drawDishIcon(ctx, order.dish, x + 24, y + 26, 40);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(order.customer, x + 46, y + 7);
      if (order.vip) {
        ctx.fillStyle = '#f0a500';
        ctx.fillText('★ VIP', x + 46, y + 23);
      }
      ctx.fillStyle = PALETTE.inkSoft;
      ctx.font = '11px system-ui, sans-serif';
      const short = DISHES[order.dish].short;
      ctx.fillText(short.length > 20 ? short.slice(0, 19) + '…' : short, x + 46, y + (order.vip ? 38 : 23));
      // The ticket's timer.
      const frac = Math.max(0, order.left / order.total);
      ctx.fillStyle = '#d4e8f5';
      roundRect(ctx, x + 8, y + TICKET.h - 10, TICKET.w - 16, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? '#3ecf8e' : frac > 0.25 ? '#ffc93c' : '#ff5a5a';
      roundRect(ctx, x + 8, y + TICKET.h - 10, (TICKET.w - 16) * frac, 5, 2.5);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(order.left)}s`, x + TICKET.w - 8, y + TICKET.h - 22);
    });
  }

  function drawHud(state) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
    // The shift clock.
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    ctx.fillStyle = '#ffc93c';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SUGAR & SPRINKLES', 14, 8);
    ctx.fillStyle = state.timeLeft <= 30 ? '#ff5a5a' : PALETTE.text;
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, 14, 26);
    ctx.fillStyle = '#14467e';
    ctx.fillRect(14, 62, 150, 6);
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(14, 62, 150 * Math.max(0, state.timeLeft / 180), 6);
    // The score, combo and hearts.
    const rightX = FIELD.width - 14;
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`$${state.score}`, rightX, 8);
    ctx.font = '700 13px system-ui, sans-serif';
    const mult = Math.min(4, 1 + Math.floor(state.combo / 2));
    ctx.fillStyle = state.combo >= 2 ? '#ffc93c' : PALETTE.muted;
    ctx.fillText(state.combo >= 2 ? `COMBO ×${mult}  (${state.combo})` : 'COMBO ×1', rightX, 40);
    ctx.font = '20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < state.hearts ? '♥' : '♡';
    ctx.fillStyle = '#e2546e';
    ctx.fillText(hearts, rightX - 64, 56);
    drawOrders(state);
    // The rush banner. It sits just below the station row (which ends at
    // y=140) on open floor: it must not cover the row, and the HUD above the
    // row has no free gap — during a rush the order tickets span to x=1022
    // and the score sits on the right.
    const rush = state.rush;
    if (rush.phase === 'warn' || rush.phase === 'active') {
      const blink = Math.floor(state.time * 4) % 2 === 0;
      ctx.fillStyle = rush.phase === 'active' ? (blink ? '#ff6b9d' : '#e2546e') : '#f0a500';
      const bw = rush.phase === 'active' ? 300 : 340;
      roundRect(ctx, (FIELD.width - bw) / 2, 148, bw, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#fffdf5';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        rush.phase === 'active' ? `BIRTHDAY RUSH!  ${Math.ceil(rush.t)}s` : `BIRTHDAY RUSH IN ${Math.ceil(rush.t)}s`,
        FIELD.width / 2,
        165,
      );
    }
    // The contextual hint, bottom left over the decorative counter.
    if (state.hint !== '') {
      ctx.font = '13px system-ui, sans-serif';
      const w = ctx.measureText(state.hint).width + 24;
      ctx.fillStyle = 'rgba(43,58,74,0.85)';
      roundRect(ctx, 12, 684, Math.min(w, 560), 24, 12);
      ctx.fill();
      ctx.fillStyle = '#fdf3c4';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.hint, 24, 696);
    }
  }

  function drawTitle(state, best, ui) {
    ctx.fillStyle = 'rgba(43,58,74,0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffc93c';
    ctx.font = '700 62px system-ui, sans-serif';
    ctx.fillText('SUGAR & SPRINKLES', FIELD.width / 2, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '700 24px system-ui, sans-serif';
    try {
      ctx.letterSpacing = '6px';
    } catch {
      // Ignore.
    }
    ctx.fillText('SUNNY BAKERY', FIELD.width / 2, 238);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Ignore.
    }
    ctx.fillStyle = '#bfe0f5';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('A bright little bakery. Mix, bake, frost, decorate — serve before the clock runs out.', FIELD.width / 2, 278);
    const blink = ui === undefined || ui.blink !== false;
    if (blink) {
      ctx.fillStyle = '#fffdf5';
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillText('PRESS SPACE TO START', FIELD.width / 2, 340);
    }
    ctx.fillStyle = '#bfe0f5';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move      SPACE — use station      Q — drop      SHIFT — dash', FIELD.width / 2, 396);
    ctx.fillText('P — pause      M — mute      R — recipes', FIELD.width / 2, 420);
    ctx.fillStyle = '#ffc93c';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('6 desserts  ·  Birthday Rush  ·  Perfect bakes pay extra', FIELD.width / 2, 462);
    if (best > 0) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText(`Best shift: $${best}`, FIELD.width / 2, 500);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(43,58,74,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fffdf5';
    ctx.font = '700 48px system-ui, sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, 320);
    ctx.fillStyle = '#bfe0f5';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press P or SPACE to keep cooking.  R for the recipe list.', FIELD.width / 2, 372);
  }

  function drawOver(state, best, ui) {
    ctx.fillStyle = 'rgba(43,58,74,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const pw = 520;
    const ph = 380;
    const px = (FIELD.width - pw) / 2;
    const py = (FIELD.height - ph) / 2;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, px, py, pw, ph, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillText('SHIFT OVER', FIELD.width / 2, py + 52);
    ctx.fillStyle = PALETTE.inkSoft;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(
      state.overReason === 'hearts' ? 'The kitchen ran out of hearts — three regulars walked out.' : 'The clock hit closing time. The ovens go quiet.',
      FIELD.width / 2,
      py + 92,
    );
    const rows = [
      ['Dishes served', String(state.served)],
      ['Perfect bakes', String(state.perfect)],
      ['Best combo', `×${Math.min(4, 1 + Math.floor(state.maxCombo / 2))}  (${state.maxCombo} serves)`],
      ['Earnings', `$${state.score}`],
      ['Best shift', `$${Math.max(best, state.score)}`],
    ];
    ctx.font = '17px system-ui, sans-serif';
    rows.forEach((row, i) => {
      const y = py + 138 + i * 34;
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.inkSoft;
      ctx.fillText(row[0], px + 60, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText(row[1], px + pw - 60, y);
      ctx.font = '17px system-ui, sans-serif';
    });
    const blink = ui === undefined || ui.blink !== false;
    if (blink) {
      ctx.fillStyle = '#ff6b9d';
      ctx.font = '700 19px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRESS SPACE TO PLAY AGAIN', FIELD.width / 2, py + ph - 36);
    }
  }

  function drawRecipes() {
    ctx.fillStyle = 'rgba(43,58,74,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const pw = 900;
    const ph = 480;
    const px = (FIELD.width - pw) / 2;
    const py = (FIELD.height - ph) / 2;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, px, py, pw, ph, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText('THE MENU', FIELD.width / 2, py + 40);
    ctx.textAlign = 'left';
    Object.keys(DISHES).forEach((id, i) => {
      const y = py + 92 + i * 62;
      const dish = DISHES[id];
      drawDishIcon(ctx, id, px + 48, y, 52);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText(`${dish.name}  —  $${dish.price}`, px + 84, y - 10);
      ctx.fillStyle = PALETTE.inkSoft;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(recipeText(id), px + 84, y + 12);
    });
    ctx.fillStyle = '#ff6b9d';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press R to close', FIELD.width / 2, py + ph - 28);
  }

  function draw(state, screen, best, ui) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawFloor();
    drawCounters();
    drawPantry(state);
    drawMixer(state);
    drawOven(state);
    drawBench(state, 'frosting', 'FROSTING', '❋');
    drawBench(state, 'decorating', 'DECORATING', '✦');
    drawPlates(state);
    drawPass(state);
    drawCompost(state);
    drawFloorItems(state);
    drawPlayer(state);
    drawParticles(state);
    drawFloats(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best, ui);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best, ui);
    if (ui !== undefined && ui.showRecipes === true) drawRecipes();
  }

  return { draw };
}
