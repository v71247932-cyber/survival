import { InventoryManager } from './InventoryManager';
import { UIManager } from '../ui/UIManager';

export class InventoryController {
    private inventory: InventoryManager;
    private ui: UIManager;

    // Drag state
    private draggedSource: { type: 'hotbar' | 'main' | 'crafting', index: number } | null = null;

    constructor(inventory: InventoryManager, ui: UIManager) {
        this.inventory = inventory;
        this.ui = ui;

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
                    // Cannot "drop" into result slot
                    this.draggedSource = null;
                    this.render();
                    return;
                }

                // Swap or move logic
                if (source.type === 'hotbar' || source.type === 'main') {
                    if (type === 'hotbar' || type === 'main') {
                        this.inventory.swapSlots(source.type, source.index, type, index);
                    } else if (type === 'crafting') {
                        // Simplified: move from inv to crafting
                        // (Usually you'd want a separate manager for the crafting grid content)
                    }
                }

                this.draggedSource = null;
                this.render();
            } else {
                // PICK UP ITEM
                if (type === 'crafting' && index === -1) {
                    // Logic to "take" result would go here
                    return;
                }

                const slot = type === 'hotbar' ? this.inventory.hotbar[index] : (type === 'main' ? this.inventory.main[index] : null);
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

        this.ui.updateHotbarSelection(this.inventory.selectedHotbarSlot);
    }
}
