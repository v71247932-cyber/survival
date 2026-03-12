export class UIManager {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.initDOM();
    }

    private initDOM() {
        this.container.innerHTML = `
            <div id="stats" style="position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); display: flex; gap: 100px; color: white; text-shadow: 2px 2px 0 #000;">
                <div id="healthStat">Health: ❤❤❤❤❤❤</div>
                <div id="hungerStat">Hunger: 🍗🍗🍗🍗🍗</div>
            </div>
            
            <div id="hotbar-container" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; padding: 4px; background: rgba(0,0,0,0.5); border: 2px solid #555;">
                ${Array(9).fill(0).map((_, i) => `<div class="slot hotbar-slot" id="hotbar-${i}" style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border: 2px solid #333; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative;"></div>`).join('')}
            </div>
            
            <div id="inventory-screen" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #c6c6c6; border: 4px solid #555; padding: 20px; box-shadow: 5px 5px 0px rgba(0,0,0,0.5); flex-direction: column; gap: 20px;">
                <h2 style="margin: 0; font-size: 16px; color: #333">Crafting</h2>
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div id="crafting-grid" style="display: grid; grid-template-columns: repeat(2, 40px); grid-template-rows: repeat(2, 40px); gap: 4px;">
                         ${Array(4).fill(0).map((_, i) => `<div class="slot part-of-crafting" id="crafting-${i}" style="width: 40px; height: 40px; background: #8b8b8b; border: 2px solid #555;"></div>`).join('')}
                    </div>
                    <div style="font-weight: bold; font-size: 24px;">➡</div>
                    <div class="slot" id="crafting-result" style="width: 40px; height: 40px; background: #8b8b8b; border: 2px solid #555;"></div>
                </div>
                
                <h2 style="margin: 0; font-size: 16px; color: #333">Inventory</h2>
                <div id="main-inventory" style="display: grid; grid-template-columns: repeat(9, 40px); grid-template-rows: repeat(3, 40px); gap: 4px;">
                     ${Array(27).fill(0).map((_, i) => `<div class="slot" id="main-${i}" style="width: 40px; height: 40px; background: #8b8b8b; border: 2px solid #555;"></div>`).join('')}
                </div>
            </div>
        `;

        // Add minimal CSS for slot contents
        const style = document.createElement('style');
        style.textContent = `
            .item-icon { width: 32px; height: 32px; image-rendering: pixelated; }
            .item-count { position: absolute; bottom: 2px; right: 2px; color: white; font-size: 12px; font-weight: bold; text-shadow: 1px 1px 0 #000; }
            .durability-bar { position: absolute; bottom: 0; left: 0; height: 4px; background: #0f0; }
            .slot.selected { border-color: white !important; }
        `;
        document.head.appendChild(style);
    }

    public updateHotbarSelection(index: number) {
        for (let i = 0; i < 9; i++) {
            const el = document.getElementById(`hotbar-${i}`);
            if (el) {
                if (i === index) el.classList.add('selected');
                else el.classList.remove('selected');
            }
        }
    }

    public toggleInventory() {
        const inv = document.getElementById('inventory-screen');
        if (inv) {
            inv.style.display = inv.style.display === 'none' ? 'flex' : 'none';
        }
        return inv?.style.display === 'flex';
    }

    // In a real app we'd map ItemID to texture URLs. We'll use colored squares for blocks, letters for tools in this prototype
    public static renderItemIcon(id: number): string {
        if (id === 0) return '';
        const colorMap: Record<number, string> = {
            1: '#4C8A36', // Grass
            2: '#63452C', // Dirt
            3: '#7D7D7D', // Stone
            4: '#8f683f', // Wood
            5: '#2F6D17', // Leaves
            6: '#DCCC8B', // Sand
        };

        if (id >= 100) return `<div style="font-size: 24px;">⛏️</div>`; // Generic tool icon

        return `<div style="width: 28px; height: 28px; background-color: ${colorMap[id]}; border: 2px solid rgba(0,0,0,0.5);"></div>`;
    }
}
