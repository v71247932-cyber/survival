import './style.css';
import * as THREE from 'three';
import { World } from './world/World';
import { Player } from './entities/Player';
import { UIManager } from './ui/UIManager';
import { InventoryController } from './gameplay/InventoryController';
import { EntityManager } from './entities/EntityManager';
import { NetworkManager } from './network/NetworkManager';
import { SaveManager } from './utils/SaveManager';

// Setup Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

// Setup Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Setup Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
    precision: "lowp" // Speed up fragment shaders for pixelated art
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped at 1.5 for better perf on high-DPI
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // Much faster than PCFSoft
document.getElementById('app')!.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
dirLight.position.set(100, 200, 50);
dirLight.castShadow = true;
dirLight.shadow.camera.left = -40; // Tighten shadow camera for better resolution at lower map size
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
dirLight.shadow.mapSize.width = 512; // Lower from 2048 to 512 for huge FPS gain
dirLight.shadow.mapSize.height = 512;
scene.add(dirLight);

// World
const world = new World(scene);

// Initial loading so player doesn't fall through unloaded chunk
world.update(new THREE.Vector3(0, 0, 0));

// Player
const player = new Player(camera, document.body, world);

// UI and Inventory
const uiLayer = document.getElementById('ui-layer')!;
const ui = new UIManager(uiLayer, world, player);
const inventoryCtrl = new InventoryController(player.inventory, ui);
(window as any).inventoryCtrl = inventoryCtrl;

document.addEventListener('keydown', (e) => {
    // Prevent actions if chat input is focused
    if (document.activeElement?.id === 'chat-input') {
        if (e.code === 'Enter') {
            const chatInput = document.getElementById('chat-input') as HTMLInputElement;
            if (chatInput && chatInput.value.trim() !== '') {
                if (networkManager.connected) {
                    networkManager.send({
                        type: 'chat',
                        message: chatInput.value.trim()
                    });
                } else {
                    addChatMessage('System', 'You must be connected to a server to chat.', '#ff5555');
                }
                chatInput.value = '';
            }

            // Unfocus chat
            document.getElementById('chat-input-container')!.style.display = 'none';
            player.controls.lock();
            document.body.focus();
            return;
        }
        return;
    }

    if (e.code === 'KeyE') {
        if ((window as any).inventoryCtrl) {
            (window as any).inventoryCtrl.handleEKey();
        }
    }

    if (e.code === 'KeyT') {
        e.preventDefault();
        const chatContainer = document.getElementById('chat-input-container');
        if (chatContainer) {
            chatContainer.style.display = 'block';
            player.controls.unlock();
            setTimeout(() => {
                document.getElementById('chat-input')?.focus();
            }, 10);
        }
    }

    if (e.code === 'Tab') {
        e.preventDefault();
        const playerListContainer = document.getElementById('player-list-container');
        if (playerListContainer) {
            playerListContainer.style.display = 'block';
            updatePlayerListUI();
        }
    }

    if (e.code === 'Escape') {
        const isPaused = ui.toggleEscapeMenu();
        if (isPaused) {
            player.controls.unlock();
        } else {
            player.controls.lock();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Tab') {
        e.preventDefault();
        const playerListContainer = document.getElementById('player-list-container');
        if (playerListContainer) {
            playerListContainer.style.display = 'none';
        }
    }
});

function updatePlayerListUI() {
    const listContent = document.getElementById('player-list-content');
    const realmLabel = document.getElementById('player-list-realm');
    if (!listContent) return;

    if (realmLabel) {
        realmLabel.innerText = `REALM: ${networkManager.currentRealm || 'OFFLINE'}`;
    }

    listContent.innerHTML = '';

    // Add self
    const usernameInput = document.getElementById('menu-username') as HTMLInputElement;
    const localName = usernameInput ? usernameInput.value : 'Player';
    listContent.innerHTML += `<div class="player-list-item"><span style="color: #55ff55">${localName} (You)</span><span>0ms</span></div>`;

    // Add remote players
    const remotePlayers = (entityManager as any).remotePlayers as Map<string, any>;
    if (remotePlayers) {
        for (const [_, rp] of remotePlayers.entries()) {
            listContent.innerHTML += `<div class="player-list-item"><span>${rp.username}</span><span>~ms</span></div>`;
        }
    }
}

// Chat system helper
function addChatMessage(username: string, message: string, color: string = '#ffffff') {
    const history = document.getElementById('chat-history');
    if (history) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg';
        msgDiv.innerHTML = `<b style="color: ${color}">${username}:</b> ${message}`;
        history.appendChild(msgDiv);

        // Keep only last 20 messages
        while (history.children.length > 20) {
            history.removeChild(history.firstChild!);
        }
    }
}

// Network Chat Event
window.addEventListener('chat_message', (e: Event) => {
    const customEvent = e as CustomEvent;
    const data = customEvent.detail;

    let color = '#ffffff';
    if (data.id === 'server') color = '#ffaa00';
    else if (data.id === networkManager.localPlayerId) color = '#55ff55';

    addChatMessage(data.username, data.message, color);
});

// Save Logic
function saveGame() {
    if (!urlRealm) return;

    const saveData = {
        seed: urlRealm,
        modifiedBlocks: world.getSaveData(),
        player: player.getState(),
        timestamp: Date.now()
    };

    SaveManager.saveWorld(urlRealm, saveData);
}

window.addEventListener('request_save_and_leave', () => {
    saveGame();
    // Redirect to main menu (root)
    window.location.href = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') || '/';
});

window.addEventListener('transit_to_realm', (e: any) => {
    const targetRealm = e.detail.realm;
    const playerState = player.getState();

    // Save only necessary parts for transit (mostly inventory)
    SaveManager.saveTransitState({
        inventory: playerState.inventory,
        health: playerState.health,
        hunger: playerState.hunger
    });

    // Redirect
    const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/') || '/';
    const joinUrl = baseUrl.endsWith('/') ? baseUrl + targetRealm : baseUrl + '/' + targetRealm;
    window.location.href = joinUrl;
});

// Entities
const entityManager = new EntityManager(scene, world, player);

// Network
const networkManager = new NetworkManager(world, entityManager, player);
(window as any).networkManager = networkManager; // Make accessible for UI to trigger connect

// Redundant listener removed, logic moved to NetworkManager.ts

// Main Loop
const clock = new THREE.Clock();
let frameCount = 0;
let lastTime = performance.now();
const fpsElement = document.getElementById('performance-stats');
let lastHudUpdate = 0;

// Auto-Realm detection
const pathParts = window.location.pathname.split('/').filter(p => p.length > 0);
const urlRealm = pathParts.length > 0 ? pathParts[0] : null;

if (urlRealm) {
    console.log(`[Realm] Detected realm: ${urlRealm}`);
    const username = `Player${Math.floor(Math.random() * 1000)}`;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const serverIp = isLocal ? 'localhost:8080' : 'survival-multiplayer-backend.onrender.com';

    // Synchronize world and spawn
    world.resetSeed(urlRealm);
    player.setSpawn(0, 0);

    // Hide menu and connect
    const menu = document.getElementById('main-menu');
    if (menu) menu.style.display = 'none';
    uiLayer.style.pointerEvents = 'none';

    // Load saved data if exists
    const savedData = SaveManager.loadWorld(urlRealm);
    if (savedData) {
        console.log(`[Save] Loading saved data for realm: ${urlRealm}`);
        world.loadSaveData(savedData.modifiedBlocks);
        player.loadState(savedData.player);
    }

    // Check for transit data (inventory from previous realm)
    const transitData = SaveManager.loadTransitState();
    if (transitData) {
        console.log(`[Transit] Carrying over inventory to new realm.`);
        // Only override if we don't have a specific save for this realm yet
        // or just merge the inventory. For simplicity, we override inventory.
        player.inventory.hotbar = transitData.inventory.hotbar;
        player.inventory.main = transitData.inventory.main;
        (player as any).survival.health = transitData.health;
        (player as any).survival.hunger = transitData.hunger;
        window.dispatchEvent(new CustomEvent('inventory_updated'));

        // Clear transit after use
        SaveManager.clearTransitState();
    }

    networkManager.connect(serverIp, username, urlRealm);
}

let lastSaveTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    frameCount++;

    // Update FPS counter every 500ms
    if (currentTime - lastTime >= 500) {
        if (fpsElement) {
            fpsElement.innerText = `FPS: ${Math.round((frameCount * 1000) / (currentTime - lastTime))}`;
        }
        lastTime = currentTime;
        frameCount = 0;
    }

    let delta = clock.getDelta();
    if (delta > 0.1) delta = 0.1; // clamp delta to prevent huge jumps

    // Throttled HUD Update (every 100ms instead of every frame)
    if (currentTime - lastHudUpdate > 100) {
        player.survival.update(delta); // Survival logic update remains frame-rate independent but HUD throttled
        const healthStat = document.getElementById('healthStat');
        if (healthStat) {
            healthStat.innerText = 'Health: ' + '❤'.repeat(Math.ceil(player.survival.health / 2)) + (player.survival.health % 2 !== 0 && player.survival.health > 0 ? '♥' : '');
        }
        const hungerStat = document.getElementById('hungerStat');
        if (hungerStat) {
            hungerStat.innerText = 'Hunger: ' + '🍗'.repeat(Math.ceil(player.survival.hunger / 2));
        }
        lastHudUpdate = currentTime;
    }

    // Auto-save every 1 minute
    if (currentTime - lastSaveTime > 60000) {
        saveGame();
        lastSaveTime = currentTime;
        console.log('[Save] Auto-saved world data.');
    }

    // Update player & physics
    player.update(delta);

    // Update chunks (rebuilds meshes if blocks changed)
    world.update(camera.position);

    // Update network
    networkManager.update();

    // Move sun with player for simple shadow mapping
    dirLight.position.set(camera.position.x + 50, camera.position.y + 100, camera.position.z + 50);
    dirLight.target.position.set(camera.position.x, camera.position.y, camera.position.z);
    dirLight.target.updateMatrixWorld();

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
