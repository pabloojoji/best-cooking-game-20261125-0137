// The pantry and the menu. Every dish is a chain of steps through the kitchen:
// mix its ingredients, then bake (except the mousse), frost and decorate where
// the dish asks for it, plate it, and serve it. A dish's `steps` list, in order,
// is what the world and the autopilot both walk.

export const INGREDIENTS = {
  flour: { name: 'Flour', nameId: 'Tepung', color: '#f3e9d2', dark: '#cbb98f' },
  egg: { name: 'Egg', nameId: 'Telur', color: '#fff6e0', dark: '#e8c96a' },
  butter: { name: 'Butter', nameId: 'Mentega', color: '#f6d54b', dark: '#d9a91e' },
  chocolate: { name: 'Chocolate', nameId: 'Cokelat', color: '#5b2a1e', dark: '#3d1a12' },
  strawberry: { name: 'Strawberry', nameId: 'Stroberi', color: '#e2546e', dark: '#a8324a' },
  cream: { name: 'Cream', nameId: 'Krim', color: '#fffaf0', dark: '#e8d9c0' },
};

export const INGREDIENT_IDS = ['flour', 'egg', 'butter', 'chocolate', 'strawberry', 'cream'];

export const DISHES = {
  torte: {
    name: 'Choco Fudge Cake',
    short: 'Choco Fudge',
    price: 18,
    ingredients: ['flour', 'chocolate', 'butter', 'egg'],
    bake: 9,
    frost: true,
    decor: true,
    body: '#5b2a1e',
    top: '#3d1a12',
    accent: '#e8b64c',
  },
  shortcake: {
    name: 'Strawberry Cloud Shortcake',
    short: 'Strawberry Cake',
    price: 16,
    ingredients: ['flour', 'egg', 'cream'],
    bake: 7,
    frost: true,
    decor: true,
    body: '#f6d9a0',
    top: '#fff3f3',
    accent: '#e2546e',
  },
  lemon: {
    name: 'Lemon Velvet Cake',
    short: 'Lemon Cake',
    price: 14,
    ingredients: ['flour', 'egg', 'butter'],
    bake: 8,
    frost: true,
    decor: false,
    body: '#f2d54b',
    top: '#fbf3c0',
    accent: '#c0395a',
  },
  mousse: {
    name: 'Mango Mousse Cup',
    short: 'Mango Mousse',
    price: 12,
    ingredients: ['cream', 'strawberry'],
    bake: 0,
    frost: false,
    decor: true,
    body: '#ffb347',
    top: '#ffe1a8',
    accent: '#e2546e',
  },
  bun: {
    name: 'Cinnamon Swirl Bun',
    short: 'Cinnamon Bun',
    price: 10,
    ingredients: ['flour', 'butter'],
    bake: 6,
    frost: true,
    decor: false,
    body: '#c98f4e',
    top: '#e8c08a',
    accent: '#8a5a2b',
  },
  brulee: {
    name: 'Vanilla Cloud Pudding',
    short: 'Vanilla Pudding',
    price: 15,
    ingredients: ['egg', 'cream'],
    bake: 5,
    frost: false,
    decor: true,
    body: '#fbf3c0',
    top: '#ffffff',
    accent: '#ffc93c',
  },
};

export const DISH_IDS = ['torte', 'shortcake', 'lemon', 'mousse', 'bun', 'brulee'];

/** The steps a dish still needs, from the item the chef is carrying. */
export function nextStep(dishId, kind) {
  const dish = DISHES[dishId];
  if (kind === 'batter') {
    if (dish.bake > 0) return 'oven';
    if (dish.frost) return 'frosting';
    if (dish.decor) return 'decorating';
    return 'plates';
  }
  if (kind === 'baked') {
    if (dish.frost) return 'frosting';
    if (dish.decor) return 'decorating';
    return 'plates';
  }
  if (kind === 'frosted') {
    if (dish.decor) return 'decorating';
    return 'plates';
  }
  if (kind === 'finished') return 'plates';
  return null;
}

/** The regulars who order at the pass, in the order the seeded deck draws them. */
export const CUSTOMERS = [
  'Maya', 'Jonas', 'Priya', 'Theo', 'Aisha', 'Marco', 'Lena', 'Ravi',
  'Sofia', 'Kenji', 'Nadia', 'Omar', 'Clara', 'Felix', 'Ines', 'Dario',
];

/** A dish's full recipe, as the recipe list shows it: each ingredient in English with its Indonesian name in brackets, so young cooks can learn both. */
export function recipeText(dishId) {
  const dish = DISHES[dishId];
  const parts = [dish.ingredients.map((id) => `${INGREDIENTS[id].name} (${INGREDIENTS[id].nameId})`).join(' + ')];
  parts.push('Mix');
  if (dish.bake > 0) parts.push(`Bake ${dish.bake}s`);
  if (dish.frost) parts.push('Frost');
  if (dish.decor) parts.push('Decorate');
  parts.push('Plate', 'Serve');
  return parts.join(' → ');
}
