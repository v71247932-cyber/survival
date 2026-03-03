// js/survival.js — Hunger, thirst, health, temperature, sanity, stamina
export class SurvivalSystem {
    constructor(game) {
        this.game = game;
        this.health = 100;
        this.hunger = 100;
        this.thirst = 100;
        this.stamina = 100;
        this.sanity = 100;
        this.bodyTemp = 37;

        this.isBleding = false;
        this.isDiseased = false;
        this.deathCause = '';

        this._tick = 0;
        this._lastNotif = {};
    }

    drainStamina(amt) {
        this.stamina = Math.max(0, this.stamina - amt);
    }

    heal(amt) {
        this.health = Math.min(100, this.health + amt);
    }

    eat(hungerAmt, thirstAmt = 0, healthAmt = 0) {
        this.hunger = Math.min(100, this.hunger + hungerAmt);
        this.thirst = Math.min(100, this.thirst + thirstAmt);
        if (healthAmt > 0) this.heal(healthAmt);
        if (healthAmt < 0) this.health = Math.max(1, this.health + healthAmt);
    }

    drink(thirstAmt, healthAmt = 0) {
        this.thirst = Math.min(100, this.thirst + thirstAmt);
        if (healthAmt < 0) this.health = Math.max(0, this.health + healthAmt);
    }

    applyBandage() {
        this.health = Math.min(100, this.health + 25);
        this.isBleding = false;
        this.game.ui.notify('🩹 Applied bandage +25 HP', 'info');
    }

    update(delta) {
        this._tick += delta;

        const isSprinting = this.game.player?.isSprinting ?? false;
        const isNight = this.game.weather?.isNight() ?? false;
        const isRaining = this.game.weather?.isRaining() ?? false;
        const nearFire = this.game.world?.isNearCampfire(this.game.player?.getPosition() ?? { distanceTo: () => 999 }) ?? false;
        const ambTemp = this.game.weather?.getTempModifier() ?? 20;

        // === Drain rates per second ===
        const hungerDrain = isSprinting ? 0.04 : 0.015;
        const thirstDrain = isSprinting ? 0.07 : 0.025;
        const staminaRegen = (isSprinting ? 0 : 8);

        this.hunger = Math.max(0, this.hunger - hungerDrain * delta);
        this.thirst = Math.max(0, this.thirst - thirstDrain * delta);
        this.stamina = Math.min(100, this.stamina + staminaRegen * delta);

        // Body temperature
        const targetTemp = nearFire ? 37 : (ambTemp < 10 ? 35 - (10 - ambTemp) * 0.3 : 37 - (37 - ambTemp) * 0.05);
        this.bodyTemp += (targetTemp - this.bodyTemp) * 0.1 * delta;
        this.bodyTemp = Math.max(30, Math.min(42, this.bodyTemp));

        // Sanity
        const alone = !isNight; // simplified
        const sanityDrain = isNight ? 0.03 : (this.health < 30 ? 0.02 : 0);
        const sanityRegen = nearFire ? 0.05 : 0;
        this.sanity = Math.max(0, Math.min(100, this.sanity - sanityDrain * delta + sanityRegen * delta));

        // Health consequences
        if (this.hunger < 1) this.health = Math.max(0, this.health - 2.0 * delta);
        if (this.thirst < 1) this.health = Math.max(0, this.health - 3.0 * delta);
        if (this.bodyTemp < 34) this.health = Math.max(0, this.health - 1.5 * delta);
        if (this.bodyTemp > 40) this.health = Math.max(0, this.health - 1.0 * delta);
        if (this.isBleding) this.health = Math.max(0, this.health - 1.0 * delta);

        // Sanity effects
        const overlay = document.getElementById('sanityOverlay');
        if (overlay) {
            const intensity = Math.max(0, (50 - this.sanity) / 50);
            overlay.style.opacity = intensity;
            overlay.style.background = `radial-gradient(ellipse at center, transparent 30%, rgba(60,0,90,${intensity * 0.7}) 100%)`;
        }

        // === Warnings (throttled) ===
        if (this._tick > 15) {
            this._tick = 0;
            this._warn();
        }

        // Death check
        if (this.health <= 0 && this.game.state === 'playing') {
            this._die();
        }
    }

    _warn() {
        const ui = this.game.ui;
        const now = Date.now();
        const throttle = (key, msg, type, cooldown) => {
            if (!this._lastNotif[key] || now - this._lastNotif[key] > cooldown) {
                ui.notify(msg, type); this._lastNotif[key] = now;
            }
        };
        if (this.hunger < 20) throttle('hunger', '🍖 Starving! Eat something!', 'danger', 30000);
        if (this.thirst < 20) throttle('thirst', '💧 Dehydrated! Drink water!', 'danger', 30000);
        if (this.health < 30) throttle('health', '❤️ Critical health!', 'danger', 20000);
        if (this.bodyTemp < 34) throttle('cold', '🥶 Hypothermia risk! Find a fire!', 'warn', 25000);
        if (this.bodyTemp > 39) throttle('hot', '🥵 Overheating! Seek shade!', 'warn', 25000);
        if (this.sanity < 30) throttle('sanity', '🧠 Losing sanity...', 'warn', 40000);
    }

    _die() {
        const causes = [];
        if (this.hunger < 1) causes.push('Starvation');
        if (this.thirst < 1) causes.push('Dehydration');
        if (this.bodyTemp < 34) causes.push('Hypothermia');
        if (this.bodyTemp > 40) causes.push('Heat stroke');
        this.deathCause = causes[0] || 'Fatal injuries';
        this.game.die(this.deathCause);
    }

    reset() {
        this.health = 100; this.hunger = 100; this.thirst = 100;
        this.stamina = 100; this.sanity = 100; this.bodyTemp = 37;
        this.isBleding = false; this.isDiseased = false;
        this._lastNotif = {};
    }
}
