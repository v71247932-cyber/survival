import { InventoryManager } from './InventoryManager';
import { UIManager } from '../ui/UIManager';
import { CraftingSystem } from './CraftingSystem';

export class InventoryController {
    private inventory: InventoryManager;
    private ui: UIManager;
    private crafting: CraftingSystem;

    // Drag state
    private draggedSource: { type: 'hotbar' | 'main' | 'crafting', index: number } | null = null;

    constructor(inventory: InventoryManager, ui: UIManager) {
        this.inventory = inventory;
        this.ui = ui;
        this.crafting = new CraftingSystem();

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

        // Click to move items
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const slotContainer = target.closest('.slot');

            // If we didn't click a slot and we aren't "carrying" anything, ignore
            if (!slotContainer && !this.draggedSource) return;

            // If we clicked outside a slot while carrying, we could drop it (for now, just cancel)
            if (!slotContainer && this.draggedSource) {
                this.draggedSource = null;
                this.render();
                return;
            }

            const id = (slotContainer as HTMLElement).id;
            if (!id) return;

            const parts = id.split('-');
            const type = parts[0] as 'hotbar' | 'main' | 'crafting';
            const index = parts[1] === 'result' ? -1 : parseInt(parts[1]);

            if (this.draggedSource) {
                // DROP/MOVE ITEM
                const source = this.draggedSource;

                if (type === 'crafting' && index === -1) {
                    this.draggedSource = null;
                    this.render();
                    return;
                }

                // Swap/Move logic
                if (type === 'crafting') {
                    const temp = this.inventory.craftingGrid[index];
                    const sourceSlot = source.type === 'hotbar' ? this.inventory.hotbar[source.index] : (source.type === 'main' ? this.inventory.main[source.index] : this.inventory.craftingGrid[source.index]);

                    if (source.type === 'hotbar') this.inventory.hotbar[source.index] = temp;
                    else if (source.type === 'main') this.inventory.main[source.index] = temp;
                    else this.inventory.craftingGrid[source.index] = temp;

                    this.inventory.craftingGrid[index] = sourceSlot;
                } else {
                    if (source.type === 'crafting') {
                        const sourceSlot = this.inventory.craftingGrid[source.index];
                        const targetSlot = type === 'hotbar' ? this.inventory.hotbar[index] : this.inventory.main[index];

                        this.inventory.craftingGrid[source.index] = targetSlot;
                        if (type === 'hotbar') this.inventory.hotbar[index] = sourceSlot;
                        else this.inventory.main[index] = sourceSlot;
                    } else {
                        this.inventory.swapSlots(source.type, source.index, type, index);
                    }
                }

                this.draggedSource = null;
                this.render();
            } else {
                // PICK UP ITEM
                if (type === 'crafting' && index === -1) {
                    // Logic to take crafting result
                    const grid2D = [
                        [this.inventory.craftingGrid[0], this.inventory.craftingGrid[1]],
                        [this.inventory.craftingGrid[2], this.inventory.craftingGrid[3]]
                    ];
                    const recipe = this.crafting.checkRecipe(grid2D);
                    if (recipe) {
                        // We need a stable ItemID reference since it's imported in Items.ts
                        const ItemID_NONE = 0;
                        if (this.inventory.addItem(recipe.result.item, recipe.result.count)) {
                            // Consume ingredients
                            for (let j = 0; j < 4; j++) {
                                if (this.inventory.craftingGrid[j].item !== ItemID_NONE) {
                                    const slot = this.inventory.craftingGrid[j];
                                    this.inventory.craftingGrid[j] = { item: slot.item, count: slot.count - 1 };
                                    if (this.inventory.craftingGrid[j].count <= 0) {
                                        this.inventory.craftingGrid[j] = { item: ItemID_NONE, count: 0 };
                                    }
                                }
                            }
                            this.render();
                        }
                    }
                    return;
                }

                const slot = type === 'hotbar' ? this.inventory.hotbar[index] : (type === 'main' ? this.inventory.main[index] : this.inventory.craftingGrid[index]);
                if (slot && slot.item !== 0) {
                    this.draggedSource = { type, index };
                    this.render();
                }
            }
        });
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
