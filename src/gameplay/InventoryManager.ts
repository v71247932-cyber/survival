import { ItemID, InventorySlot } from './Items';

export class InventoryManager {
    public hotbar: InventorySlot[] = Array(9).fill({ item: ItemID.NONE, count: 0 });
    public main: InventorySlot[] = Array(27).fill({ item: ItemID.NONE, count: 0 });
    public craftingGrid: InventorySlot[] = Array(4).fill({ item: ItemID.NONE, count: 0 });
    public selectedHotbarSlot = 0;

    constructor() {
        // Give some starting items for testing
        this.addItem(ItemID.DIRT_BLOCK, 10);
    }

    private notifyUI() {
        window.dispatchEvent(new CustomEvent('inventory_updated'));
    }

    public addItem(item: ItemID, count: number, durability?: number): boolean {
        // Find existing stack
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i].item === item && this.hotbar[i].count < 64 && !durability) {
                const add = Math.min(64 - this.hotbar[i].count, count);
                this.hotbar[i] = { item, count: this.hotbar[i].count + add };
                count -= add;
                if (count === 0) {
                    this.notifyUI();
                    return true;
                }
            }
        }
        for (let i = 0; i < 27; i++) {
            if (this.main[i].item === item && this.main[i].count < 64 && !durability) {
                const add = Math.min(64 - this.main[i].count, count);
                this.main[i] = { item, count: this.main[i].count + add };
                count -= add;
                if (count === 0) {
                    this.notifyUI();
                    return true;
                }
            }
        }

        // Find empty slot
        for (let i = 0; i < 9; i++) {
            if (this.hotbar[i].item === ItemID.NONE) {
                this.hotbar[i] = { item, count, durability };
                this.notifyUI();
                return true;
            }
        }
        for (let i = 0; i < 27; i++) {
            if (this.main[i].item === ItemID.NONE) {
                this.main[i] = { item, count, durability };
                this.notifyUI();
                return true;
            }
        }

        return false; // Inventory full
    }

    public getSelectedSlot(): InventorySlot {
        return this.hotbar[this.selectedHotbarSlot];
    }

    public consumeSelectedSlot() {
        const slot = this.hotbar[this.selectedHotbarSlot];
        if (slot.item !== ItemID.NONE) {
            slot.count--;
            if (slot.count <= 0) {
                this.hotbar[this.selectedHotbarSlot] = { item: ItemID.NONE, count: 0 };
            }
            this.notifyUI();
        }
    }

    public damageSelectedTool() {
        const slot = this.hotbar[this.selectedHotbarSlot];
        if (slot.durability !== undefined) {
            slot.durability--;
            if (slot.durability <= 0) {
                this.hotbar[this.selectedHotbarSlot] = { item: ItemID.NONE, count: 0 };
            }
            this.notifyUI();
        }
    }

    public swapSlots(fromType: 'hotbar' | 'main', fromIdx: number, toType: 'hotbar' | 'main', toIdx: number) {
        const fromArr = fromType === 'hotbar' ? this.hotbar : this.main;
        const toArr = toType === 'hotbar' ? this.hotbar : this.main;

        const temp = fromArr[fromIdx];
        fromArr[fromIdx] = toArr[toIdx];
        toArr[toIdx] = temp;
        this.notifyUI();
    }
}
