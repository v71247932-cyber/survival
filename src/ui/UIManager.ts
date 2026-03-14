export class UIManager {
    private container: HTMLElement;
    private static namePopupTimeout: number | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.initDOM();
    }

    private initDOM() {
        this.container.innerHTML = `

            
            <div id="persistent-hud" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: auto;">
                <div id="stats" style="display: flex; gap: 20px; color: white; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); font-family: 'Inter', sans-serif; font-size: 13px;">
                    <div id="healthStat" style="display: flex; align-items: center; gap: 6px; font-weight: bold; background: rgba(0,10,20,0.6); padding: 5px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px);">Health: ❤❤❤❤❤❤</div>
                    <div id="hungerStat" style="display: flex; align-items: center; gap: 6px; font-weight: bold; background: rgba(0,10,20,0.6); padding: 5px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px);">Hunger: 🍗🍗🍗🍗🍗</div>
                </div>
                <!-- Item Name Popup -->
                <div id="item-name-popup" style="position: absolute; bottom: 120px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; opacity: 0; transition: opacity 0.3s, transform 0.3s; pointer-events: none; z-index: 1002;">Dirt</div>

                <!-- Stats HUD -->
                <div id="hotbar-container" style="display: flex; gap: 6px; padding: 6px; background: rgba(0,10,20,0.8); border: 2px solid rgba(255,255,255,0.1); border-radius: 12px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    ${Array(9).fill(0).map((_, i) => `<div class="slot hotbar-slot" id="hotbar-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px; display: flex; justify-content: center; align-items: center; cursor: pointer; position: relative; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);"></div>`).join('')}
                </div>
            </div>
            
            <div id="inventory-screen" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, rgba(20,30,48,0.95), rgba(36,59,85,0.95)); border: 2px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); backdrop-filter: blur(20px); flex-direction: column; gap: 20px; font-family: 'Inter', sans-serif; color: white; z-index: 1001; pointer-events: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 id="crafting-title" style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #fff; text-transform: uppercase;">Inventory (2x2)</h2>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.4);">CRAFTING</div>
                </div>
                <div style="display: flex; gap: 30px; align-items: center; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div id="crafting-grid" style="display: grid; grid-template-columns: repeat(2, 46px); grid-template-rows: repeat(2, 46px); gap: 6px;">
                         ${Array(4).fill(0).map((_, i) => `<div class="slot part-of-crafting" id="crafting-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px;"></div>`).join('')}
                    </div>
                    <div style="font-weight: 200; font-size: 32px; color: rgba(255,255,255,0.2);">→</div>
                    <div class="slot" id="crafting-result" style="width: 56px; height: 56px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 20px rgba(255,255,255,0.05);"></div>
                </div>

                <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-top: 10px;">Backpack</h2>
                <div id="main-inventory" style="display: grid; grid-template-columns: repeat(9, 46px); grid-template-rows: repeat(3, 46px); gap: 6px;">
                     ${Array(27).fill(0).map((_, i) => `<div class="slot" id="main-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px;"></div>`).join('')}
                </div>
            </div>
            
            <div id="main-menu" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)); display: flex; justify-content: center; align-items: center; pointer-events: auto; z-index: 1000; font-family: 'Inter', sans-serif;">
                <div style="background: rgba(10,20,30,0.8); padding: 50px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); color: white; text-align: center; box-shadow: 0 30px 100px rgba(0,0,0,0.5); backdrop-filter: blur(15px); max-width: 400px; width: 90%;">
                    <h1 style="margin-top: 0; font-size: 42px; font-weight: 900; background: linear-gradient(45deg, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px; margin-bottom: 5px;">ANTIGRAVITY</h1>
                    <p style="color: rgba(255,255,255,0.4); margin-bottom: 40px; font-size: 14px;">ULTIMATE SURVIVAL EXPERIENCE</p>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <input id="menu-username" type="text" placeholder="Username" style="padding: 14px; border-radius: 12px; font-size: 16px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); outline: none;" value="Player${Math.floor(Math.random() * 1000)}" />
                        <input id="menu-ip" type="text" placeholder="Server Address" style="padding: 14px; border-radius: 12px; font-size: 16px; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); outline: none;" value="localhost:8080" />
                        <button id="btn-singleplayer" style="padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 700; background: #fff; color: #000; border: none; cursor: pointer;">Start Adventure</button>
                        <button id="btn-multiplayer" style="padding: 16px; border-radius: 12px; font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">Connect to Realm</button>
                    </div>
                </div>
            </div>

            <div id="floating-item" style="position: fixed; pointer-events: none; z-index: 2000; width: 46px; height: 46px; display: none; justify-content: center; align-items: center;"></div>
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
            #floating-item .item-count {
                bottom: -5px;
                right: -5px;
                font-size: 14px;
                padding: 2px 6px;
            }
            #floating-item .item-icon {
                width: 40px;
                height: 40px;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
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
                if (e.code === 'KeyE') {
                    const isOpening = ui.toggleInventory();
                    if (isOpening) {
                        player.controls.unlock();
                    } else {
                        player.controls.lock();
                        // Closing inventory always resets 3x3 table state
                        if ((window as any).inventoryCtrl) {
                            (window as any).inventoryCtrl.isTableOpen = false;
                            (window as any).inventoryCtrl.render();
                        }
                    }
                } (window as any).networkManager.connect(ip, username);
            }
                menu.style.display = 'none';
            this.container.style.pointerEvents = 'none';
        });
    }
}

    public showItemName(name: string) {
    const popup = document.getElementById('item-name-popup');
    if (!popup) return;

    popup.innerText = name;
    popup.style.opacity = '1';
    popup.style.transform = 'translateX(-50%) translateY(0)';

    if (UIManager.namePopupTimeout) clearTimeout(UIManager.namePopupTimeout);
    UIManager.namePopupTimeout = window.setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) translateY(10px)';
    }, 2000);
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
        const isVisible = inv.style.display === 'none';
        inv.style.display = isVisible ? 'flex' : 'none';
        // Enable/disable pointer events on the container so we can click the inventory
        this.container.style.pointerEvents = isVisible ? 'auto' : 'none';
    }
    return inv?.style.display === 'flex';
}

    // Procedural Pixel Art Rendering
    public static renderItemIcon(id: number): string {
    if (id === 0) return '';

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    // Default color patterns
    const drawPixel = (x: number, y: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    };

    const drawNoise = (color: string, intensity: number = 20) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 16, 16);
        const alpha = intensity / 255;
        for (let i = 0; i < 80; i++) {
            const x = Math.floor(Math.random() * 16);
            const y = Math.floor(Math.random() * 16);
            const dark = Math.random() > 0.5;
            ctx.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
            ctx.fillRect(x, y, 1, 1);
        }
        // Bevel effect
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 0, 1, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 15, 16, 1); ctx.fillRect(15, 0, 1, 16);
    };

    // Render based on ID
    switch (id) {
        case 1: // Grass
            drawNoise('#4C8A36', 30);
            ctx.fillStyle = '#63452C'; ctx.fillRect(0, 12, 16, 4); // Dirt bottom
            for (let i = 0; i < 16; i++) { if (Math.random() > 0.5) drawPixel(i, 11, '#4C8A36'); }
            break;
        case 2: drawNoise('#63452C', 40); break; // Dirt
        case 3: drawNoise('#7D7D7D', 30); break; // Stone
        case 4: // Wood
            drawNoise('#8f683f', 20);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(4, 0, 1, 16); ctx.fillRect(11, 0, 1, 16);
            break;
        case 6: drawNoise('#DCCC8B', 15); break; // Sand
        case 9: // Cobblestone
            drawNoise('#777', 40);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for (let i = 0; i < 10; i++) drawPixel(Math.random() * 16, Math.random() * 16, 'rgba(0,0,0,0.3)');
            break;
        case 10: // Planks
            drawNoise('#a07c4e', 15);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 15, 16, 1);
            ctx.fillRect(7, 0, 1, 8); ctx.fillRect(12, 8, 1, 8);
            break;
        case 14: drawNoise('#FFD700', 50); break; // Gold
        case 16: drawNoise('#E8E8E8', 20); break; // Iron
        case 17: // Crafting Table (Detailed)
            drawNoise('#a07c4e', 15);
            ctx.fillStyle = '#4a3321';
            ctx.fillRect(0, 0, 16, 2); // Top rim
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            // Grid pattern on top
            for (let i = 1; i < 4; i++) {
                ctx.fillRect(4 * i, 2, 1, 14);
                ctx.fillRect(0, 4 * i + 2, 16, 1);
            }
            // Little hammer icon detail
            ctx.fillStyle = '#777'; ctx.fillRect(10, 10, 3, 2);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(11, 11, 1, 3);
            break;
        case 18: // Bed
            ctx.fillStyle = '#cc3333'; ctx.fillRect(1, 6, 14, 8); // Blanket
            ctx.fillStyle = '#eee'; ctx.fillRect(1, 2, 14, 4); // Pillow
            ctx.fillStyle = '#5d4037'; ctx.fillRect(1, 13, 2, 2); ctx.fillRect(13, 13, 2, 2); // Legs
            break;
        case 19: drawNoise('#ffffff', 10); break; // Wool
        case 50: // Stick
            ctx.fillStyle = '#6d4c2a';
            for (let i = 0; i < 12; i++) {
                drawPixel(2 + i, 13 - i, '#6d4c2a');
                if (i % 3 == 0) drawPixel(2 + i, 12 - i, '#8a6642');
            }
            break;
        case 51: // Iron Ingot
            ctx.fillStyle = '#E8E8E8';
            ctx.fillRect(4, 5, 8, 5);
            ctx.fillStyle = '#fff'; ctx.fillRect(5, 6, 6, 1);
            ctx.fillStyle = '#999'; ctx.fillRect(5, 9, 6, 1);
            break;
        case 52: // Gold Ingot
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(4, 5, 8, 5);
            ctx.fillStyle = '#ffff00'; ctx.fillRect(5, 6, 6, 1);
            ctx.fillStyle = '#b8860b'; ctx.fillRect(5, 9, 6, 1);
            break;
    }

    // Tools rendering logic (simplified pixel shapes)
    if (id >= 100 && id < 140) {
        const matId = id % 10;
        const colors = ['#8f683f', '#aaa', '#eee', '#ffd700'];
        const headColor = colors[matId];
        const darkColor = ['#5d4037', '#777', '#999', '#b8860b'][matId];

        // Stick
        ctx.fillStyle = '#6d4c2a';
        for (let i = 0; i < 12; i++) drawPixel(2 + i, 13 - i, '#6d4c2a');

        if (id >= 100 && id < 110) { // Pickaxe
            ctx.fillStyle = headColor;
            ctx.fillRect(3, 2, 10, 2);
            ctx.fillRect(2, 3, 2, 3);
            ctx.fillRect(12, 3, 2, 3);
            ctx.fillStyle = darkColor; drawPixel(8, 3, darkColor);
        } else if (id >= 110 && id < 120) { // Axe
            ctx.fillStyle = headColor;
            ctx.fillRect(8, 2, 4, 5);
            ctx.fillRect(7, 3, 1, 3);
            ctx.fillStyle = darkColor; drawPixel(9, 3, darkColor);
        } else if (id >= 120 && id < 130) { // Shovel
            ctx.fillStyle = headColor;
            ctx.fillRect(10, 1, 4, 4);
            ctx.fillStyle = darkColor; drawPixel(11, 2, darkColor);
        } else if (id >= 130 && id < 140) { // Sword
            ctx.fillStyle = headColor;
            for (let i = 0; i < 10; i++) drawPixel(5 + i, 10 - i, headColor);
            ctx.fillStyle = darkColor; drawPixel(4, 11, darkColor); drawPixel(5, 12, darkColor);
            ctx.fillStyle = '#4a3321'; drawPixel(2, 13, '#4a3321'); // Hilt
        }
    }

    return `<div class="item-icon" style="background-image: url(${canvas.toDataURL()}); background-size: contain; background-repeat: no-repeat; image-rendering: pixelated;"></div>`;
}

    public setCraftingMode(isTable: boolean) {
    const grid = document.getElementById('crafting-grid');
    const title = document.getElementById('crafting-title');
    if (!grid || !title) return;

    title.innerText = isTable ? "Workbench (3x3)" : "Inventory (2x2)";

    if (isTable) {
        grid.style.gridTemplateColumns = 'repeat(3, 46px)';
        grid.style.gridTemplateRows = 'repeat(3, 46px)';
        grid.innerHTML = Array(9).fill(0).map((_, i) => `<div class="slot part-of-crafting" id="crafting-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px;"></div>`).join('');
    } else {
        grid.style.gridTemplateColumns = 'repeat(2, 46px)';
        grid.style.gridTemplateRows = 'repeat(2, 46px)';
        grid.innerHTML = Array(4).fill(0).map((_, i) => `<div class="slot part-of-crafting" id="crafting-${i}" style="width: 46px; height: 46px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.05); border-radius: 8px;"></div>`).join('');
    }
}
}
