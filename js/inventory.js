// js/inventory.js — Grid inventory with hotbar
import { ITEMS } from './data.js';

export class Inventory {
    constructor(game) {
        this.game = game;
        this.slots = Array(20).fill(null).map(() => ({ id: null, qty: 0 }));
        this.hotbar = [0, 1, 2, 3, 4, 5, 6, 7]; // slot indices linked to hotbar
        this.hotbarIndex = 0;
        this.maxWeight = 50;
    }

    getCurrentWeight() {
        return this.slots.reduce((w, s) => {
            if (!s.id) return w;
            return w + (ITEMS[s.id]?.weight ?? 0) * s.qty;
        }, 0);
    }

    addItem(id, qty = 1) {
        if (!ITEMS[id]) return false;
        const item = ITEMS[id];
        let remaining = qty;

        console.log(`[Inventory] addItem: ${qty}x ${id}`);

        // Try to stack into existing slot
        for (const slot of this.slots) {
            if (remaining <= 0) break;
            if (slot.id === id && slot.qty < (item.stack ?? 1)) {
                const canAdd = Math.min(remaining, (item.stack ?? 1) - slot.qty);
                slot.qty += canAdd;
                remaining -= canAdd;
            }
        }

        // Fill empty slots
        for (const slot of this.slots) {
            if (remaining <= 0) break;
            if (!slot.id) {
                const canAdd = Math.min(remaining, item.stack ?? 1);
                slot.id = id;
                slot.qty = canAdd;
                remaining -= canAdd;
            }
        }

        if (remaining < qty) this.game.ui?.renderInventory();
        return remaining === 0;
    }

    removeItem(id, qty = 1) {
        let toRemove = qty;
        for (const slot of this.slots) {
            if (toRemove <= 0) break;
            if (slot.id === id) {
                const take = Math.min(slot.qty, toRemove);
                slot.qty -= take;
                toRemove -= take;
                if (slot.qty <= 0) { slot.id = null; slot.qty = 0; }
            }
        }
        this.game.ui?.renderInventory();
        return toRemove === 0;
    }

    hasItem(id, qty = 1) {
        return this.countItem(id) >= qty;
    }

    countItem(id) {
        return this.slots.reduce((t, s) => t + (s.id === id ? s.qty : 0), 0);
    }

    getSelectedItem() {
        const slotIdx = this.hotbar[this.hotbarIndex];
        const slot = this.slots[slotIdx];
        if (!slot?.id) return null;
        return { id: slot.id, qty: slot.qty, data: ITEMS[slot.id] };
    }

    selectHotbar(idx) {
        this.hotbarIndex = Math.max(0, Math.min(7, idx));
        this.game.ui?.renderHotbar();
    }

    useSelectedItem() {
        const item = this.getSelectedItem();
        if (!item) return;
        const data = item.data;
        const surv = this.game.survival;

        // Consumables
        if (data.hunger || data.thirst || data.health) {
            surv?.eat(data.hunger ?? 0, data.thirst ?? 0, data.health ?? 0);
            this.removeItem(item.id, 1);
            this.game.ui?.notify(`Used ${data.icon} ${data.name}`, 'info');
            return;
        }

        // Placeables
        if (data.placeable) {
            this.game.building?.selectPiece(data.placeable, item.id);
            this.game.ui?.openPanel('buildPanel');
            return;
        }

        this.game.ui?.notify(`Equipped ${data.icon} ${data.name}`);
    }

    dropItem(slotIdx) {
        const slot = this.slots[slotIdx];
        if (!slot?.id) return;
        this.game.ui?.notify(`Dropped ${ITEMS[slot.id]?.icon} ${ITEMS[slot.id]?.name}`);
        slot.id = null; slot.qty = 0;
        this.game.ui?.renderInventory();
    }
}
