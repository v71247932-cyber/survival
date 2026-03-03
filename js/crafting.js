// js/crafting.js — Recipe system with crafting progress
import { RECIPES, ITEMS } from './data.js';

export class CraftingSystem {
    constructor(game) {
        this.game = game;
        this.queue = null; // { recipe, elapsed, total }
        this.selectedRecipe = null;
    }

    canCraft(recipe) {
        const inv = this.game.inventory;
        const nearFire = this.game.world?.isNearCampfire(this.game.player?.getPosition() ?? { distanceTo: () => 999 });
        if (recipe.station === 'campfire' && !nearFire) return false;
        return recipe.ing.every(i => inv.hasItem(i.id, i.qty));
    }

    startCraft(recipeId) {
        const recipe = RECIPES.find(r => r.id === recipeId);
        if (!recipe || !this.canCraft(recipe) || this.queue) return false;

        this.queue = { recipe, elapsed: 0, total: recipe.time };
        const el = document.getElementById('craftProgress');
        const nm = document.getElementById('cpName');
        if (el) { el.classList.remove('hidden'); nm.textContent = `Crafting ${ITEMS[recipe.result]?.name}...`; }
        return true;
    }

    cancelCraft() {
        this.queue = null;
        document.getElementById('craftProgress')?.classList.add('hidden');
    }

    update(delta) {
        if (!this.queue) return;
        this.queue.elapsed += delta;
        const pct = Math.min(100, (this.queue.elapsed / this.queue.total) * 100);
        const bar = document.getElementById('cpBar');
        if (bar) bar.style.width = pct + '%';

        if (this.queue.elapsed >= this.queue.total) {
            this._finishCraft();
        }
    }

    _finishCraft() {
        const { recipe } = this.queue;
        const inv = this.game.inventory;

        // Double-check (in case items were used elsewhere)
        if (!this.canCraft(recipe)) {
            this.game.ui?.notify('Crafting failed — missing ingredients!', 'danger');
            this.cancelCraft();
            return;
        }

        // Remove ingredients
        recipe.ing.forEach(i => inv.removeItem(i.id, i.qty));
        // Add result
        inv.addItem(recipe.result, recipe.qty);

        const item = ITEMS[recipe.result];
        this.game.ui?.notify(`✅ Crafted ${item?.icon} ${item?.name} ×${recipe.qty}`);
        this.cancelCraft();
        this.game.ui?.renderCrafting();
    }

    getAll() { return RECIPES; }
    getAvailable() { return RECIPES.filter(r => this.canCraft(r)); }
}
