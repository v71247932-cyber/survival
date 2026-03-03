// js/data.js — Item definitions and crafting recipes
export const ITEMS = {
    wood: { name: 'Wood', icon: '🪵', stack: 50, weight: 1.0, desc: 'Basic building material.' },
    stone: { name: 'Stone', icon: '🪨', stack: 50, weight: 2.0, desc: 'Hard mineral for tools.' },
    fiber: { name: 'Fiber', icon: '🌿', stack: 50, weight: 0.3, desc: 'Fibrous plant material.' },
    flint: { name: 'Flint', icon: '🔺', stack: 20, weight: 0.5, desc: 'Sharp stone shard for tools.' },
    berries: { name: 'Berries', icon: '🫐', stack: 20, weight: 0.2, desc: 'Wild berries. Restores hunger.', hunger: 12, thirst: 5 },
    raw_meat: { name: 'Raw Meat', icon: '🥩', stack: 10, weight: 0.8, desc: 'Uncooked meat. Must be cooked.' },
    cooked_meat: { name: 'Cooked Meat', icon: '🍗', stack: 10, weight: 0.7, desc: 'Very filling. Restores 40 hunger.', hunger: 40, thirst: -5 },
    water_dirty: { name: 'Dirty Water', icon: '🥤', stack: 3, weight: 0.5, desc: 'Collected water. Purify before drinking.', thirst: 20, health: -15 },
    water_clean: { name: 'Clean Water', icon: '💧', stack: 3, weight: 0.5, desc: 'Safe drinking water.', thirst: 40 },
    bandage: { name: 'Bandage', icon: '🩹', stack: 10, weight: 0.1, desc: 'Heals 25 HP. Stops bleeding.', health: 25 },
    axe: { name: 'Stone Axe', icon: '🪓', stack: 1, weight: 1.5, desc: 'Chop trees 3x faster.', tool: 'axe' },
    pickaxe: { name: 'Pickaxe', icon: '⛏️', stack: 1, weight: 1.8, desc: 'Mine rocks 3x faster.', tool: 'pickaxe' },
    knife: { name: 'Flint Knife', icon: '🗡️', stack: 1, weight: 0.5, desc: 'Melee weapon. Dmg 15.', damage: 15 },
    torch: { name: 'Torch', icon: '🔦', stack: 3, weight: 0.4, desc: 'Provides light at night.' },
    rope: { name: 'Rope', icon: '🪢', stack: 20, weight: 0.3, desc: 'Crafting component.' },
    campfire: { name: 'Campfire', icon: '🔥', stack: 3, weight: 5.0, desc: 'Place for warmth and cooking.', placeable: 'campfire' },
    wooden_wall: { name: 'Wood Wall', icon: '🧱', stack: 10, weight: 5.0, desc: 'Basic wall. 500 HP.', placeable: 'wall' },
    wooden_floor: { name: 'Wood Floor', icon: '⬛', stack: 10, weight: 4.0, desc: 'Foundation piece.', placeable: 'floor' },
    wooden_door: { name: 'Wood Door', icon: '🚪', stack: 5, weight: 3.0, desc: 'Entryway for structures.', placeable: 'door' },
    wooden_roof: { name: 'Wood Roof', icon: '🏠', stack: 10, weight: 4.0, desc: 'Shelter from rain.', placeable: 'roof' },
};

export const RECIPES = [
    { id: 'rope', result: 'rope', qty: 2, ing: [{ id: 'fiber', qty: 8 }], time: 2, station: null, desc: 'Basic crafting component.' },
    { id: 'bandage', result: 'bandage', qty: 2, ing: [{ id: 'fiber', qty: 5 }], time: 2, station: null, desc: 'Heals 25 HP.' },
    { id: 'torch', result: 'torch', qty: 2, ing: [{ id: 'wood', qty: 2 }, { id: 'fiber', qty: 3 }], time: 2, station: null, desc: 'Light source.' },
    { id: 'axe', result: 'axe', qty: 1, ing: [{ id: 'wood', qty: 3 }, { id: 'stone', qty: 2 }, { id: 'fiber', qty: 2 }], time: 4, station: null, desc: 'Chop trees faster.' },
    { id: 'pickaxe', result: 'pickaxe', qty: 1, ing: [{ id: 'wood', qty: 3 }, { id: 'stone', qty: 3 }, { id: 'fiber', qty: 2 }], time: 4, station: null, desc: 'Mine rocks faster.' },
    { id: 'knife', result: 'knife', qty: 1, ing: [{ id: 'flint', qty: 2 }, { id: 'fiber', qty: 3 }], time: 3, station: null, desc: 'Melee weapon.' },
    { id: 'campfire', result: 'campfire', qty: 1, ing: [{ id: 'wood', qty: 5 }, { id: 'stone', qty: 3 }], time: 3, station: null, desc: 'Warmth and cooking.' },
    { id: 'wooden_floor', result: 'wooden_floor', qty: 1, ing: [{ id: 'wood', qty: 6 }], time: 2, station: null, desc: 'For building floors.' },
    { id: 'wooden_wall', result: 'wooden_wall', qty: 1, ing: [{ id: 'wood', qty: 8 }], time: 2, station: null, desc: 'For building walls.' },
    { id: 'wooden_door', result: 'wooden_door', qty: 1, ing: [{ id: 'wood', qty: 6 }, { id: 'rope', qty: 1 }], time: 3, station: null, desc: 'Entry door.' },
    { id: 'wooden_roof', result: 'wooden_roof', qty: 1, ing: [{ id: 'wood', qty: 8 }], time: 2, station: null, desc: 'Shelter roof.' },
    { id: 'cooked_meat', result: 'cooked_meat', qty: 1, ing: [{ id: 'raw_meat', qty: 1 }], time: 5, station: 'campfire', desc: 'Cook meat on campfire.' },
    { id: 'water_clean', result: 'water_clean', qty: 1, ing: [{ id: 'water_dirty', qty: 1 }, { id: 'stone', qty: 1 }], time: 4, station: 'campfire', desc: 'Purify water over fire.' },
];

export const BUILD_PIECES = [
    { id: 'floor', item: 'wooden_floor', name: 'Floor', icon: '⬛', color: 0x8B6914 },
    { id: 'wall', item: 'wooden_wall', name: 'Wall', icon: '🧱', color: 0x8B4513 },
    { id: 'door', item: 'wooden_door', name: 'Door', icon: '🚪', color: 0x6B3410 },
    { id: 'roof', item: 'wooden_roof', name: 'Roof', icon: '🏠', color: 0x7B5420 },
    { id: 'campfire', item: 'campfire', name: 'Campfire', icon: '🔥', color: 0xFF4500 },
];
