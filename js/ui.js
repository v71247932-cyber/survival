// js/ui.js — HUD updates, panels, notifications, inventory render
import { ITEMS, RECIPES, BUILD_PIECES } from './data.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.notifQueue = [];
        this._setupPanelClose();
    }

    _setupPanelClose() {
        document.querySelectorAll('.px').forEach(btn => {
            btn.addEventListener('click', () => {
                const panelId = btn.dataset.panel;
                if (panelId) this.closePanel(panelId);
            });
        });
        document.addEventListener('keydown', e => {
            if (e.code === 'Tab') { e.preventDefault(); this.togglePanel('invPanel'); }
            if (e.code === 'KeyC') this.togglePanel('craftPanel');
        });
    }

    openPanel(id) {
        document.getElementById(id)?.classList.remove('hidden');
        if (id === 'invPanel') this.renderInventory();
        if (id === 'craftPanel') this.renderCrafting();
        if (id === 'buildPanel') this.renderBuildMenu();
        document.exitPointerLock();
    }

    closePanel(id) {
        document.getElementById(id)?.classList.add('hidden');
    }

    togglePanel(id) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.classList.contains('hidden')) this.openPanel(id);
        else this.closePanel(id);
    }

    showScreen(id) {
        ['mainMenu', 'loadingScreen', 'clickFocus', 'pauseMenu', 'deathScreen'].forEach(s => {
            document.getElementById(s)?.classList.add('hidden');
        });
        if (id) document.getElementById(id)?.classList.remove('hidden');
    }

    showHUD(visible) {
        const hud = document.getElementById('hud');
        if (hud) hud.classList.toggle('hidden', !visible);
    }

    update() {
        const surv = this.game.survival;
        const weather = this.game.weather;
        const inv = this.game.inventory;
        if (!surv) return;

        // Vitals
        const bars = [
            ['vHealth', 'vHealthN', surv.health],
            ['vHunger', 'vHungerN', surv.hunger],
            ['vThirst', 'vThirstN', surv.thirst],
            ['vSanity', 'vSanityN', surv.sanity],
            ['vStamina', null, surv.stamina],
        ];
        bars.forEach(([fillId, numId, val]) => {
            const fill = document.getElementById(fillId);
            if (fill) fill.style.width = Math.max(0, Math.min(100, val)) + '%';
            if (numId) {
                const num = document.getElementById(numId);
                if (num) num.textContent = Math.round(val);
            }
        });

        // Temperature bar — map 30–42°C to 0–100%
        const tempFill = document.getElementById('vTemp');
        const tempNum = document.getElementById('vTempN');
        if (tempFill) tempFill.style.width = ((surv.bodyTemp - 30) / 12 * 100) + '%';
        if (tempNum) tempNum.textContent = surv.bodyTemp.toFixed(1) + '°';

        // Time/weather
        if (weather) {
            const timeEl = document.getElementById('timeText');
            const iconEl = document.getElementById('timeIcon');
            const wIcon = document.getElementById('weatherIcon');
            const tempEl = document.getElementById('tempText');
            const dayEl = document.getElementById('timeText');
            if (timeEl) timeEl.textContent = `Day ${weather.day} · ${weather.getTimeStr()}`;
            if (iconEl) iconEl.textContent = weather.getIcon();
            if (wIcon) wIcon.textContent = weather.getWeatherIcon();
            if (tempEl) tempEl.textContent = Math.round(weather.getTempModifier()) + '°C';
        }

        this.renderHotbar();
    }

    renderHotbar() {
        const inv = this.game.inventory;
        const hotbar = document.getElementById('hotbar');
        if (!hotbar || !inv) return;
        hotbar.innerHTML = '';

        for (let i = 0; i < 8; i++) {
            const slotIdx = inv.hotbar[i];
            const slot = inv.slots[slotIdx];
            const item = slot?.id ? ITEMS[slot.id] : null;
            const div = document.createElement('div');
            div.className = 'hslot' + (i === inv.hotbarIndex ? ' active' : '');
            div.innerHTML = `
        <span class="slot-num">${i + 1}</span>
        ${item ? `<span>${item.icon}</span>${slot.qty > 1 ? `<span class="slot-qty">${slot.qty}</span>` : ''}` : ''}
      `;
            div.addEventListener('click', () => inv.selectHotbar(i));
            hotbar.appendChild(div);
        }
    }

    renderInventory() {
        const inv = this.game.inventory;
        const grid = document.getElementById('invGrid');
        const wtEl = document.getElementById('weightTxt');
        if (!grid || !inv) return;
        grid.innerHTML = '';

        if (wtEl) wtEl.textContent = inv.getCurrentWeight().toFixed(1);

        inv.slots.forEach((slot, i) => {
            const item = slot?.id ? ITEMS[slot.id] : null;
            const div = document.createElement('div');
            div.className = 'inv-slot' + (item ? ' occupied' : '');
            div.innerHTML = item
                ? `<span>${item.icon}</span>${slot.qty > 1 ? `<span class="sq">${slot.qty}</span>` : ''}
           <span class="sname">${item.name}</span>`
                : '';

            if (item) {
                div.title = `${item.name}\n${item.desc || ''}\nWeight: ${item.weight}kg`;
                div.addEventListener('click', () => {
                    inv.useSelectedItem?.call?.(inv) ?? null;
                    // Select this slot in hotbar
                    inv.hotbarIndex = inv.hotbar.indexOf(i);
                    if (inv.hotbarIndex < 0) inv.hotbarIndex = 0;
                    this.renderHotbar();
                });
                div.addEventListener('contextmenu', e => { e.preventDefault(); inv.dropItem(i); });
            }
            grid.appendChild(div);
        });
    }

    renderCrafting() {
        const craft = this.game.crafting;
        const list = document.getElementById('recipeList');
        const detail = document.getElementById('recipeDetail');
        if (!list || !craft) return;
        list.innerHTML = '';

        RECIPES.forEach(recipe => {
            const item = ITEMS[recipe.result];
            const can = craft.canCraft(recipe);
            const div = document.createElement('div');
            div.className = 'recipe-item' + (craft.selectedRecipe?.id === recipe.id ? ' active' : '');
            div.innerHTML = `
        <span class="recipe-icon">${item?.icon || '?'}</span>
        <span class="recipe-name">${item?.name || recipe.id}</span>
        <span class="recipe-can ${can ? 'yes' : ''}"></span>
      `;
            div.addEventListener('click', () => {
                craft.selectedRecipe = recipe;
                this._showRecipeDetail(recipe, detail, craft);
                this.renderCrafting();
            });
            list.appendChild(div);
        });

        if (craft.selectedRecipe) {
            this._showRecipeDetail(craft.selectedRecipe, detail, craft);
        }
    }

    _showRecipeDetail(recipe, detail, craft) {
        const inv = this.game.inventory;
        const item = ITEMS[recipe.result];
        const can = craft.canCraft(recipe);

        const nearFire = this.game.world?.isNearCampfire(this.game.player?.getPosition() ?? { distanceTo: () => 999 });
        const stationOk = !recipe.station || (recipe.station === 'campfire' && nearFire);

        detail.innerHTML = `
      <div class="rd-title">${item?.icon} ${item?.name}</div>
      <div class="rd-desc">${item?.desc || ''}</div>
      ${recipe.station ? `<div class="rd-desc" style="color:#f59e0b">⚠️ Requires: ${recipe.station}${recipe.station === 'campfire' && !nearFire ? ' (not nearby)' : ''}</div>` : ''}
      <div class="rd-ings">
        ${recipe.ing.map(i => {
            const have = inv.countItem(i.id);
            const ok = have >= i.qty;
            return `<div class="ing-row">
            <span>${ITEMS[i.id]?.icon}</span>
            <span class="${ok ? 'have' : 'miss'}">${ITEMS[i.id]?.name}: ${have}/${i.qty}</span>
          </div>`;
        }).join('')}
      </div>
      <button class="btn-craft ${can ? 'ready' : 'notready'}" id="craftBtn">
        ${can ? `🔨 Craft ×${recipe.qty} (${recipe.time}s)` : '🚫 Missing ingredients'}
      </button>
    `;

        document.getElementById('craftBtn')?.addEventListener('click', () => {
            if (can) { craft.startCraft(recipe.id); this.renderCrafting(); }
        });
    }

    renderBuildMenu() {
        const grid = document.getElementById('buildGrid');
        if (!grid) return;
        grid.innerHTML = '';
        BUILD_PIECES.forEach(piece => {
            const inv = this.game.inventory;
            const has = inv?.hasItem(piece.item, 1);
            const div = document.createElement('div');
            div.className = 'build-btn' + (has ? '' : ' locked');
            div.innerHTML = `<span class="bi">${piece.icon}</span>${piece.name}${!has ? '<br><small style="color:#ef4444">No materials</small>' : ''}`;
            div.addEventListener('click', () => {
                if (!has) { this.notify(`Need ${ITEMS[piece.item]?.name}!`, 'danger'); return; }
                this.game.building?.selectPiece(piece.id, piece.item);
                this.closePanel('buildPanel');
                document.getElementById('gameCanvas')?.requestPointerLock();
            });
            grid.appendChild(div);
        });
    }

    notify(msg, type = 'info') {
        const notifs = document.getElementById('notifications');
        if (!notifs) return;

        const div = document.createElement('div');
        div.className = 'notif' + (type === 'danger' ? ' danger' : type === 'warn' ? ' warn' : '');
        div.textContent = msg;
        notifs.appendChild(div);

        setTimeout(() => { div.classList.add('fadeout'); setTimeout(() => div.remove(), 500); }, 3000);
    }

    flashHit() {
        const overlay = document.getElementById('hitOverlay');
        if (!overlay) return;
        overlay.style.background = 'rgba(200,0,0,0.35)';
        setTimeout(() => overlay.style.background = 'rgba(200,0,0,0)', 300);
    }
}
