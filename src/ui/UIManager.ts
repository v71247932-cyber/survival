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
            
            <div id="main-menu" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: url('/textures/dirt.png') repeat; background-size: 64px 64px; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; z-index: 1000;">
                <div style="background: rgba(0,0,0,0.8); padding: 40px; border: 4px solid #555; color: white; text-align: center; font-family: 'Courier New', monospace;">
                    <h1 style="margin-top: 0; color: #aaa;">Survival Blocks</h1>
                    <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
                        <input id="menu-username" type="text" placeholder="Username" style="padding: 10px; font-family: inherit; font-size: 16px; background: #333; color: white; border: 2px solid #555;" value="Player${Math.floor(Math.random() * 1000)}" />
                        <input id="menu-ip" type="text" placeholder="Server IP (e.g. wss://your-server.onrender.com or localhost:8080)" style="padding: 10px; font-family: inherit; font-size: 16px; background: #333; color: white; border: 2px solid #555;" value="localhost:8080" />
                        <button id="btn-singleplayer" style="padding: 10px 20px; font-family: inherit; font-size: 16px; background: #555; color: white; border: 2px solid white; cursor: pointer; margin-top: 10px;">Play Singleplayer</button>
                        <button id="btn-multiplayer" style="padding: 10px 20px; font-family: inherit; font-size: 16px; background: #3a7a3a; color: white; border: 2px solid white; cursor: pointer;">Connect to Server</button>
                        <p style="font-size: 12px; color: #888; max-width: 300px; margin-top: 10px;">Note: You need to run the NodeJS backend somewhere (e.g., Render) to play multiplayer.</p>
                    </div>
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
            button:hover { filter: brightness(1.2); }
            button:active { filter: brightness(0.8); }
        `;
        document.head.appendChild(style);

        this.setupMenu();
    }

    private setupMenu() {
        const menu = document.getElementById('main-menu');
        const btnSingle = document.getElementById('btn-singleplayer');
        const btnMulti = document.getElementById('btn-multiplayer');
        const inputUsername = document.getElementById('menu-username') as HTMLInputElement;
        const inputIp = document.getElementById('menu-ip') as HTMLInputElement;

        if (menu && btnSingle && btnMulti && inputUsername && inputIp) {
            btnSingle.addEventListener('click', () => {
                menu.style.display = 'none';
                this.container.style.pointerEvents = 'none';
            });

            btnMulti.addEventListener('click', () => {
                const username = inputUsername.value;
                const ip = inputIp.value;
                if ((window as any).networkManager) {
                    (window as any).networkManager.connect(ip, username);
                }
                menu.style.display = 'none';
                this.container.style.pointerEvents = 'none';
            });
        }
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
            9: '#808080', // Cobblestone
            10: '#b8945f', // Wood Planks
            11: '#6b6b6b', // Gravel
            12: '#a34e3d', // Bricks
            13: '#d9cc96', // Sandstone
            14: '#ffd700', // Gold
            15: '#262626', // Bedrock
        };

        if (id === 50) return `<div style="font-size: 24px;">🥢</div>`; // Stick icon
        if (id >= 100) return `<div style="font-size: 24px;">⛏️</div>`; // Generic tool icon

        return `<div style="width: 28px; height: 28px; background-color: ${colorMap[id]}; border: 2px solid rgba(0,0,0,0.5);"></div>`;
    }
}
