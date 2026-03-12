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

        // Drag and Drop (simplified simulated drag via clicks for prototype)
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            const slotContainer = target.closest('.slot');
            if (!slotContainer) return;

            const id = slotContainer.id; // e.g., 'hotbar-0', 'main-5', 'crafting-1'
            if (!id) return;

            const parts = id.split('-');
            const type = parts[0] as 'hotbar' | 'main' | 'crafting';
            if (type === 'crafting' && parts[1] === 'result') return; // Cannot drag FROM result this easily

            const index = parseInt(parts[1]);

            if (this.draggedSource) {
                // Drop
                if (this.draggedSource.type === 'hotbar' || this.draggedSource.type === 'main') {
                    if (type === 'hotbar' || type === 'main') {
                        this.inventory.swapSlots(this.draggedSource.type, this.draggedSource.index, type, index);
                    }
                }
                this.draggedSource = null;
                this.render();

            } else {
                // Pick up
                this.draggedSource = { type, index };
                (slotContainer as HTMLElement).style.opacity = '0.5';
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
