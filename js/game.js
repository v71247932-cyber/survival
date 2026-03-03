// js/game.js — Main entry point, game loop, state machine
import * as THREE from 'three';
import { World } from './world.js';
import { WeatherSystem } from './weather.js';
import { Player } from './player.js';
import { SurvivalSystem } from './survival.js';
import { Inventory } from './inventory.js';
import { CraftingSystem } from './crafting.js';
import { BuildingSystem } from './building.js';
import { EntityManager } from './entities.js';
import { UIManager } from './ui.js';
import { Multiplayer } from './multiplayer.js';

class Game {
    constructor() {
        this.state = 'menu'; // menu | loading | playing | paused | dead
        this.keys = {};

        // Three.js
        const canvas = document.getElementById('gameCanvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(innerWidth, innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.9;

        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();

        // Systems (constructed but not init yet)
        this.world = new World(this);
        this.weather = new WeatherSystem(this);
        this.ui = new UIManager(this);
        this.multiplay = new Multiplayer(this);
        this.inventory = null;
        this.survival = null;
        this.player = null;
        this.crafting = null;
        this.building = null;
        this.entities = null;

        // Dummy camera until player created
        this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1500);

        this._setupInput();
        this._setupResize();
        this._setupMenuButtons();

        // Start render loop immediately (shows menu background)
        this._loop();
    }

    _setupInput() {
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') {
                if (this.state === 'playing') this._pause();
                else if (this.state === 'paused') this._resume();
            }
        });
        document.addEventListener('keyup', e => { this.keys[e.code] = false; });
        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    _setupResize() {
        window.addEventListener('resize', () => {
            this.renderer.setSize(innerWidth, innerHeight);
            if (this.player) {
                this.player.camera.aspect = innerWidth / innerHeight;
                this.player.camera.updateProjectionMatrix();
            }
        });
    }

    _setupMenuButtons() {
        document.getElementById('btnNew')?.addEventListener('click', () => this._startNewGame());
        document.getElementById('btnLoad')?.addEventListener('click', () => this._loadGame());
        document.getElementById('btnResume')?.addEventListener('click', () => this._resume());
        document.getElementById('btnSave')?.addEventListener('click', () => this._save());
        document.getElementById('btnToMain')?.addEventListener('click', () => this._toMain());
        document.getElementById('btnRespawn')?.addEventListener('click', () => this._respawn());
        document.getElementById('btnDeathMain')?.addEventListener('click', () => this._toMain());
    }

    async _startNewGame() {
        this.state = 'loading';
        this.ui.showScreen('loadingScreen');

        // Small delay for render
        await this._delay(50);

        // Generate world
        this.world.generate((pct, msg) => {
            document.getElementById('loadingBar').style.width = pct + '%';
            document.getElementById('loadingMsg').textContent = msg;
        });

        await this._delay(100);

        // Init systems
        this.inventory = new Inventory(this);
        this.survival = new SurvivalSystem(this);
        this.crafting = new CraftingSystem(this);
        this.building = new BuildingSystem(this);
        this.entities = new EntityManager(this);
        this.player = new Player(this);

        this.weather.init();
        this.player.spawn();
        this.entities.spawn();

        // Camera is now player's camera
        this.camera = this.player.camera;

        // Starter items
        this.inventory.addItem('fiber', 10);
        this.inventory.addItem('stone', 5);
        this.inventory.addItem('berries', 3);
        this.inventory.addItem('water_dirty', 1);

        await this._delay(300);

        this.state = 'playing';
        this.ui.showScreen(null);
        this.ui.showHUD(true);
        this.ui.renderHotbar();
        this.ui.showScreen('clickFocus');
        this.ui.notify('🌲 Welcome to WildEdge! Find food and shelter to survive.', 'info');
    }

    _pause() {
        this.state = 'paused';
        document.exitPointerLock();
        this.ui.showScreen('pauseMenu');
    }

    _resume() {
        this.state = 'playing';
        this.ui.showScreen(null);
        document.getElementById('gameCanvas')?.requestPointerLock();
    }

    _save() {
        if (!this.inventory || !this.survival || !this.player) return;
        const save = {
            day: this.weather.day,
            time: this.weather.time,
            pos: this.player.getPosition(),
            health: this.survival.health,
            hunger: this.survival.hunger,
            thirst: this.survival.thirst,
            sanity: this.survival.sanity,
            slots: this.inventory.slots,
        };
        localStorage.setItem('wildedge_save', JSON.stringify(save));
        this.ui.notify('💾 Game saved!', 'info');
    }

    _loadGame() {
        const raw = localStorage.getItem('wildedge_save');
        if (!raw) { this.ui.notify('No save found!', 'danger'); this._startNewGame(); return; }
        this._startNewGame().then(() => {
            const save = JSON.parse(raw);
            this.weather.day = save.day ?? 1;
            this.weather.time = save.time ?? 8;
            if (save.pos) this.player.yaw.position.set(save.pos.x, save.pos.y, save.pos.z);
            this.survival.health = save.health ?? 100;
            this.survival.hunger = save.hunger ?? 100;
            this.survival.thirst = save.thirst ?? 100;
            this.survival.sanity = save.sanity ?? 100;
            if (save.slots) this.inventory.slots = save.slots;
            this.ui.notify('💾 Save loaded!', 'info');
        });
    }

    _toMain() {
        this.state = 'menu';
        this.ui.showHUD(false);
        this.ui.showScreen('mainMenu');
        document.exitPointerLock();
    }

    die(cause) {
        this.state = 'dead';
        document.getElementById('deathCause').textContent = 'Cause: ' + cause;
        document.getElementById('deathTime').textContent = `Survived: Day ${this.weather?.day ?? 1}`;
        document.exitPointerLock();
        this.ui.showScreen('deathScreen');
    }

    _respawn() {
        this.survival?.reset();
        this.player?.spawn();
        this.state = 'playing';
        this.ui.showScreen(null);
        document.getElementById('gameCanvas')?.requestPointerLock();
        this.ui.notify('You respawned. Be more careful!', 'warn');
    }

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    _loop() {
        requestAnimationFrame(() => this._loop());
        const delta = Math.min(this.clock.getDelta(), 0.08);

        if (this.state === 'playing') {
            this.player?.update(delta);
            this.survival?.update(delta);
            this.crafting?.update(delta);
            this.entities?.update(delta);
            this.weather?.update(delta);
            this.world?.update(delta);
            this.building?.update();

            // Sync movement to server
            if (this.multiplay.isConnected) {
                const pos = this.player.getPosition();
                this.multiplay.sendMove(pos, this.player.yaw.rotation.y);
            }
        }

        if (this.state === 'playing' || this.state === 'paused') {
            this.ui?.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => new Game());
