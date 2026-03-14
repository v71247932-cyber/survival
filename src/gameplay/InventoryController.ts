import { InventoryManager } from './InventoryManager';
import { UIManager } from '../ui/UIManager';
import { CraftingSystem } from './CraftingSystem';

export class InventoryController {
    private inventory: InventoryManager;
    private ui: UIManager;
    private crafting: CraftingSystem;

    // Held item state
    private heldItem: { item: number, count: number, durability?: number } | null = null;
    private floatingEl: HTMLElement | null = null;

    constructor(inventory: InventoryManager, ui: UIManager) {
        this.inventory = inventory;
        this.ui = ui;
        this.crafting = new CraftingSystem();

        this.floatingEl = document.getElementById('floating-item');

        this.bindEvents();
        this.render();
    }

    private bindEvents() {
        // Hotbar selection 1-9
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '9') {
                const idx = parseInt(e.key) - 1;
                this.inventory.selectedHotbarSlot = idx;
                this.render();
            }
        });

        window.addEventListener('inventory_updated', () => {
            this.render();
        });

        // Track mouse for floating item
        window.addEventListener('mousemove', (e) => {
            if (this.heldItem && this.floatingEl) {
                this.floatingEl.style.left = `${e.clientX - 23}px`;
                this.floatingEl.style.top = `${e.clientY - 23}px`;
            }
        });

        // Prevent right click menu on inventory
        document.addEventListener('contextmenu', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.slot')) {
                e.preventDefault();
            }
        });

        // Click to move items
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            const slotContainer = target.closest('.slot');
            const isRightClick = e.button === 2;

            // If we didn't click a slot and we aren't "carrying" anything, ignore
            if (!slotContainer && !this.heldItem) return;

            // If we clicked outside a slot while carrying, we could drop it (for now, just cancel)
            if (!slotContainer && this.heldItem) {
                // If it came from a source, we should return it, but since we use heldItem as copy, 
                // we'll just try to add it back to inventory or drop it.
                // For simplicity, we'll try to add it back.
                if (this.inventory.addItem(this.heldItem.item, this.heldItem.count, this.heldItem.durability)) {
                    this.heldItem = null;
                    this.updateFloatingItem();
                    this.render();
                }
                return;
            }

            const id = (slotContainer as HTMLElement).id;
            if (!id) return;

            const parts = id.split('-');
            const type = parts[0] as 'hotbar' | 'main' | 'crafting';
            const index = parts[1] === 'result' ? -1 : parseInt(parts[1]);

            if (this.heldItem) {
                // DROP/MOVE ITEM
                const held = this.heldItem;

                if (type === 'crafting' && index === -1) {
                    // Cannot drop onto result slot
                    return;
                }

                const targetSlot = type === 'hotbar' ? this.inventory.hotbar[index] : (type === 'main' ? this.inventory.main[index] : this.inventory.craftingGrid[index]);

                if (isRightClick) {
                    // DROP ONE
                    if (targetSlot.item === 0 || targetSlot.item === held.item) {
                        const newCount = targetSlot.item === 0 ? 1 : targetSlot.count + 1;
                        if (newCount <= 64) {
                            const newSlot = { item: held.item, count: newCount, durability: held.durability };
                            if (type === 'hotbar') this.inventory.hotbar[index] = newSlot;
                            else if (type === 'main') this.inventory.main[index] = newSlot;
                            else this.inventory.craftingGrid[index] = newSlot;

                            held.count--;
                            if (held.count <= 0) this.heldItem = null;
                        }
                    }
                } else {
                    // LEFT CLICK - FULL SWAP / DROP ALL
                    if (targetSlot.item === held.item && targetSlot.count < 64) {
                        // Merge stacks
                        const canAdd = 64 - targetSlot.count;
                        const toAdd = Math.min(canAdd, held.count);
                        targetSlot.count += toAdd;
                        held.count -= toAdd;
                        if (held.count <= 0) this.heldItem = null;
                    } else {
                        // Swap
                        const temp = { ...targetSlot };
                        const newSlot = { ...held };
                        if (type === 'hotbar') this.inventory.hotbar[index] = newSlot;
                        else if (type === 'main') this.inventory.main[index] = newSlot;
                        else this.inventory.craftingGrid[index] = newSlot;

                        if (temp.item === 0) this.heldItem = null;
                        else this.heldItem = temp;
                    }
                }

                this.updateFloatingItem();
                this.render();
            } else {
                // PICK UP ITEM
                if (type === 'crafting' && index === -1) {
                    // Logic to take crafting result (always takes all)
                    if (isRightClick) return; // Right click on result does nothing special yet

                    const grid2D = [
                        [this.inventory.craftingGrid[0], this.inventory.craftingGrid[1]],
                        [this.inventory.craftingGrid[2], this.inventory.craftingGrid[3]]
                    ];
                    const recipe = this.crafting.checkRecipe(grid2D);
                    if (recipe) {
                        this.heldItem = { item: recipe.result.item, count: recipe.result.count };
                        // Consume ingredients
                        for (let j = 0; j < 4; j++) {
                            const slot = this.inventory.craftingGrid[j];
                            if (slot.item !== 0) {
                                this.inventory.craftingGrid[j] = { item: slot.item, count: slot.count - 1 };
                                if (this.inventory.craftingGrid[j].count <= 0) {
                                    this.inventory.craftingGrid[j] = { item: 0, count: 0 };
                                }
                            }
                        }
                        this.updateFloatingItem();
                        this.render();
                    }
                    return;
                }

                let slot = type === 'hotbar' ? this.inventory.hotbar[index] : (type === 'main' ? this.inventory.main[index] : this.inventory.craftingGrid[index]);

                if (slot && slot.item !== 0) {
                    if (isRightClick) {
                        // PICK HALF
                        const takeCount = Math.ceil(slot.count / 2);
                        this.heldItem = { ...slot, count: takeCount };
                        slot.count -= takeCount;
                        if (slot.count <= 0) {
                            if (type === 'hotbar') this.inventory.hotbar[index] = { item: 0, count: 0 };
                            else if (type === 'main') this.inventory.main[index] = { item: 0, count: 0 };
                            else this.inventory.craftingGrid[index] = { item: 0, count: 0 };
                        }
                    } else {
                        // PICK ALL
                        this.heldItem = { ...slot };
                        if (type === 'hotbar') this.inventory.hotbar[index] = { item: 0, count: 0 };
                        else if (type === 'main') this.inventory.main[index] = { item: 0, count: 0 };
                        else this.inventory.craftingGrid[index] = { item: 0, count: 0 };
                    }
                    this.updateFloatingItem();
                    this.render();
                }
            }
        });
    }

    private updateFloatingItem() {
        if (!this.floatingEl) return;
        if (this.heldItem) {
            this.floatingEl.style.display = 'flex';
            this.floatingEl.innerHTML = `${UIManager.renderItemIcon(this.heldItem.item)} <span class="item-count">${this.heldItem.count > 1 ? this.heldItem.count : ''}</span>`;
        } else {
            this.floatingEl.style.display = 'none';
        }
    }

    public render() {
        // Hotbar
        for (let i = 0; i < 9; i++) {
            const slot = this.inventory.hotbar[i];
            const el = document.getElementById(`hotbar-${i}`);
            if (el) {
                if (slot.item === 0) el.innerHTML = '';
                else el.innerHTML = `${UIManager.renderItemIcon(slot.item)} <span class="item-count">${slot.count > 1 ? slot.count : ''}</span>`;
            }
        }

        // Main inventory
        for (let i = 0; i < 27; i++) {
            const slot = this.inventory.main[i];
            const el = document.getElementById(`main-${i}`);
            if (el) {
                if (slot.item === 0) el.innerHTML = '';
                else el.innerHTML = `${UIManager.renderItemIcon(slot.item)} <span class="item-count">${slot.count > 1 ? slot.count : ''}</span>`;
            }
        }

        // Crafting Grid
        for (let i = 0; i < 4; i++) {
            const slot = this.inventory.craftingGrid[i];
            const el = document.getElementById(`crafting-${i}`);
            if (el) {
                if (slot.item === 0) el.innerHTML = '';
                else el.innerHTML = `${UIManager.renderItemIcon(slot.item)} <span class="item-count">${slot.count > 1 ? slot.count : ''}</span>`;
            }
        }

        // Crafting Result
        const grid2D = [
            [this.inventory.craftingGrid[0], this.inventory.craftingGrid[1]],
            [this.inventory.craftingGrid[2], this.inventory.craftingGrid[3]]
        ];
        const recipe = this.crafting.checkRecipe(grid2D);
        const resultEl = document.getElementById('crafting-result');
        if (resultEl) {
            if (recipe) resultEl.innerHTML = `${UIManager.renderItemIcon(recipe.result.item)} <span class="item-count">${recipe.result.count > 1 ? recipe.result.count : ''}</span>`;
            else resultEl.innerHTML = '';
        }

        this.ui.updateHotbarSelection(this.inventory.selectedHotbarSlot);
    }
}
