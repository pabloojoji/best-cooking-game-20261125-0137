# Sugar & Sprinkles — Sunny Bakery

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/pabloojoji/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/pabloojoji/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A bright, cheerful bakery game for young cooks, made for the make.fun bounty
[Make the best cooking game](https://make.fun/bounty/best-cooking-game-20261125-0137).
One chef, one 3-minute shift, six desserts, and a Birthday Rush that doubles
the orders when the clock is running down. The recipe list names every
ingredient in English and Indonesian, so kids can learn both as they play.

## How to play

Take ingredients from the pantry, mix them, bake them in the golden window,
frost and decorate, plate the dish and put it on the serving pass. Each
ticket names a regular and their dessert — serve it before their timer runs
out. Serve in a row to build a combo (up to ×4 pay). A perfect bake, taken
out of the oven in the golden window, pays a $5 bonus. Let a dish burn or a
ticket expire and you lose a heart and the combo. Three hearts gone, or the
clock at closing time, and the shift is over.

**The menu**

| Dessert | Recipe |
| --- | --- |
| Choco Fudge Cake — $18 | Flour + Chocolate + Butter + Egg → Mix → Bake 9s → Frost → Decorate → Plate |
| Strawberry Cloud Shortcake — $16 | Flour + Egg + Cream → Mix → Bake 7s → Frost → Decorate → Plate |
| Lemon Velvet Cake — $14 | Flour + Egg + Butter → Mix → Bake 8s → Frost → Plate |
| Mango Mousse Cup — $12 | Cream + Strawberry → Mix → Decorate → Plate |
| Cinnamon Swirl Bun — $10 | Flour + Butter → Mix → Bake 6s → Frost → Plate |
| Vanilla Cloud Pudding — $15 | Egg + Cream → Mix → Bake 5s → Decorate → Plate |

VIP tickets pay double. The Birthday Rush strikes twice a shift, with a
warning first — faster orders, more tickets, shorter timers.

## Controls

- **WASD / arrows** — move the chef
- **Space / click** — use a station (take, add, start, serve)
- **Q** — drop what you are carrying
- **Shift** — dash
- **P / Esc** — pause
- **M** — mute
- **R** — recipe list

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop
browser. No network is used: all art is drawn in canvas code and all sound
is synthesized with WebAudio. `?seed=N` fixes the order deck;
`?shot=start|play|rush|end&seed=N` stages a screenshot scene.

## Files

- `game/src/config.js` — tuning numbers and colours
- `game/src/random.js` — seeded random (mulberry32)
- `game/src/audio.js` — synthesized sounds and the sunny music-box tune
- `game/src/input.js` — keyboard, mouse and touch input
- `game/src/recipes.js` — the pantry, the menu and the recipe chains
- `game/src/world.js` — the kitchen's state and rules
- `game/src/autopilot.js` — the chef that plays the real rules for screenshots
- `game/src/render.js` — all the drawing: kitchen, food, chef, HUD, screens
- `game/src/shots.js` — the screenshot scenes
- `game/src/main.js` — boot and the one loop
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
