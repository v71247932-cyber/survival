import './style.css';
import * as THREE from 'three';
import { World } from './world/World';
import { Player } from './entities/Player';
import { UIManager } from './ui/UIManager';
import { InventoryController } from './gameplay/InventoryController';
import { EntityManager } from './entities/EntityManager';
import { NetworkManager } from './network/NetworkManager';

// Setup Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

// Setup Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Setup Renderer
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app')!.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
dirLight.position.set(100, 200, 50);
dirLight.castShadow = true;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// World
const world = new World(scene);

// Initial loading so player doesn't fall through unloaded chunk
world.update(new THREE.Vector3(0, 0, 0));

// Player
const player = new Player(camera, document.body, world);

// UI and Inventory
const uiLayer = document.getElementById('ui-layer')!;
const ui = new UIManager(uiLayer);
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
        if (ui.toggleInventory()) {
            player.controls.unlock();
        } else {
            player.controls.lock();
            if ((window as any).inventoryCtrl) (window as any).inventoryCtrl.isTableOpen = false;
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
    if (!listContent) return;

    listContent.innerHTML = '';

    // Add self
    const usernameInput = document.getElementById('menu-username') as HTMLInputElement;
    const localName = usernameInput ? usernameInput.value : 'Player';
    listContent.innerHTML += `<div class="player-list-item"><span style="color: #55ff55">${localName} (You)</span><span>0ms</span></div>`;

    // Add remote players
    const entities = (entityManager as any).remotePlayers as Map<string, any>;
    if (entities) {
        for (const [_, rp] of entities.entries()) {
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

// Entities
const entityManager = new EntityManager(scene, world, player);

// Network
const networkManager = new NetworkManager(world, entityManager, player);
(window as any).networkManager = networkManager; // Make accessible for UI to trigger connect

// Redundant listener removed, logic moved to NetworkManager.ts

// Main Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    let delta = clock.getDelta();
    if (delta > 0.1) delta = 0.1; // clamp delta to prevent huge jumps

    // Survival Update
    player.survival.update(delta);

    const healthStat = document.getElementById('healthStat');
    if (healthStat) {
        healthStat.innerText = 'Health: ' + '❤'.repeat(Math.ceil(player.survival.health / 2)) + (player.survival.health % 2 !== 0 && player.survival.health > 0 ? '♥' : '');
    }
    const hungerStat = document.getElementById('hungerStat');
    if (hungerStat) {
        hungerStat.innerText = 'Hunger: ' + '🍗'.repeat(Math.ceil(player.survival.hunger / 2));
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
