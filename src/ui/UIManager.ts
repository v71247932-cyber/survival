export class UIManager {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.initDOM();
    }

    private initDOM() {
        this.container.innerHTML = `
            <div id="stats" style="position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); display: flex; gap: 80px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); font-family: 'Inter', sans-serif;">
                <div id="healthStat" style="display: flex; align-items: center; gap: 10px; font-weight: bold; background: rgba(0,10,20,0.6); padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px);">Health: ❤❤❤❤❤❤</div>
                <div id="hungerStat" style="display: flex; align-items: center; gap: 10px; font-weight: bold; background: rgba(0,10,20,0.6); padding: 8px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px);">Hunger: 🍗🍗🍗🍗🍗</div>
            </div>
            
            <div id="hotbar-container" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; padding: 6px; background: rgba(0,10,20,0.8); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                ${Array(9).fill(0).map((_, i) => `<div class="slot hotbar-slot" id="hotbar-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);"></div>`).join('')}
            </div>
            
            <div id="inventory-screen" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, rgba(20,30,48,0.95), rgba(36,59,85,0.95)); border: 2px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); backdrop-filter: blur(20px); flex-direction: column; gap: 20px; font-family: 'Inter', sans-serif; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #fff; text-transform: uppercase;">Crafting</h2>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.4);">SHARPEN YOUR TOOLS</div>
                </div>
                <div style="display: flex; gap: 30px; align-items: center; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div id="crafting-grid" style="display: grid; grid-template-columns: repeat(2, 46px); grid-template-rows: repeat(2, 46px); gap: 6px;">
                         ${Array(4).fill(0).map((_, i) => `<div class="slot part-of-crafting" id="crafting-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px;"></div>`).join('')}
                    </div>
                    <div style="font-weight: 200; font-size: 32px; color: rgba(255,255,255,0.2);">→</div>
                    <div class="slot" id="crafting-result" style="width: 56px; height: 56px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 20px rgba(255,255,255,0.05);"></div>
                </div>
                
                <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #fff;">Backpack</h2>
                <div id="main-inventory" style="display: grid; grid-template-columns: repeat(9, 46px); grid-template-rows: repeat(3, 46px); gap: 6px;">
                     ${Array(27).fill(0).map((_, i) => `<div class="slot" id="main-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px;"></div>`).join('')}
                </div>
            </div>
            
            <div id="main-menu" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2070') center/cover; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: auto; z-index: 1000; font-family: 'Inter', sans-serif;">
                <div style="background: rgba(10,20,30,0.9); padding: 50px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); color: white; text-align: center; box-shadow: 0 30px 100px rgba(0,0,0,0.9); backdrop-filter: blur(15px); max-width: 400px; width: 90%;">
                    <h1 style="margin-top: 0; font-size: 42px; font-weight: 900; background: linear-gradient(45deg, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px; margin-bottom: 5px;">ANTIGRAVITY</h1>
                    <p style="color: rgba(255,255,255,0.4); margin-bottom: 40px; font-size: 14px;">ULTIMATE SURVIVAL EXPERIENCE</p>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <input id="menu-username" type="text" placeholder="Username" style="padding: 14px; border-radius: 12px; font-size: 16px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); outline: none; transition: all 0.3s;" value="Player${Math.floor(Math.random() * 1000)}" />
                        <input id="menu-ip" type="text" placeholder="Server Address" style="padding: 14px; border-radius: 12px; font-size: 16px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); outline: none; transition: all 0.3s;" value="localhost:8080" />
                        <button id="btn-singleplayer" style="padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; background: #fff; color: #000; border: none; cursor: pointer; transition: transform 0.2s, background 0.2s;">Start Adventure</button>
                        <button id="btn-multiplayer" style="padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s;">Connect to Realm</button>
                    </div>
                </div>
            </div>
        `;

        // Add minimal CSS for slot contents
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
            .item-icon { width: 34px; height: 34px; border-radius: 6px; position: relative; }
            .item-count { position: absolute; bottom: -2px; right: -2px; color: white; font-size: 11px; font-weight: 900; background: rgba(0,0,0,0.5); padding: 1px 4px; border-radius: 4px; }
            .slot.selected { border-color: #fff !important; background: rgba(255,255,255,0.1) !important; box-shadow: 0 0 15px rgba(255,255,255,0.3); transform: scale(1.05); }
            .slot:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.2) !important; }
            .slot.dragging { opacity: 0.4; }
            button:hover { transform: scale(1.02); filter: brightness(1.1); }
            button:active { transform: scale(0.98); }
            input:focus { border-color: #fff !important; background: rgba(255,255,255,0.1) !important; }
            .item-detail {
                background: linear-gradient(135deg, var(--c1), var(--c2));
                box-shadow: inset 0 0 10px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.2);
            }
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

    // Updated with high-quality CSS "textures"
    public static renderItemIcon(id: number): string {
        if (id === 0) return '';

        // Premium color palettes for "detailed" look
        const palettes: Record<number, { c1: string, c2: string }> = {
            1: { c1: '#55ff55', c2: '#22aa22' }, // Grass (Vibrant)
            2: { c1: '#885533', c2: '#442211' }, // Dirt (Rich)
            3: { c1: '#aaaaaa', c2: '#555555' }, // Stone (Granite)
            4: { c1: '#bb8866', c2: '#774422' }, // Wood (Oak)
            5: { c1: '#228822', c2: '#114411' }, // Leaves (Deep)
            6: { c1: '#eeeebb', c2: '#ccaa88' }, // Sand (Smooth)
            9: { c1: '#999999', c2: '#666666' }, // Cobblestone
            10: { c1: '#eebb88', c2: '#cc9966' }, // Wood Planks
            11: { c1: '#777777', c2: '#444444' }, // Gravel
            12: { c1: '#cc5544', c2: '#882211' }, // Bricks
            13: { c1: '#ebd6a7', c2: '#d4b37d' }, // Sandstone
            14: { c1: '#ffee77', c2: '#ffcc00' }, // Gold
            15: { c1: '#333333', c2: '#111111' }, // Bedrock
        };

        if (id === 50) return `<div style="font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform: rotate(-15deg);">🥢</div>`; // Stick
        if (id >= 100) {
            const toolColor = id === 101 ? '#aaa' : '#8f683f';
            return `<div style="font-size: 28px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 2px ${toolColor});">⛏️</div>`;
        }

        const p = palettes[id] || { c1: '#ff00ff', c2: '#880088' };
        return `<div class="item-icon item-detail" style="--c1: ${p.c1}; --c2: ${p.c2};"></div>`;
    }
}
