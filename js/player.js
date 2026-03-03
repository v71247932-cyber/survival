// js/player.js — First-person controller with PointerLock
import * as THREE from 'three';
import { getTerrainHeight } from './world.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;

        // Camera rig
        this.yaw = new THREE.Object3D(); // horizontal rotation
        this.pitch = new THREE.Object3D(); // vertical rotation
        this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1500);

        this.yaw.add(this.pitch);
        this.pitch.add(this.camera);
        this.scene.add(this.yaw);

        // Player state
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.height = 1.75;
        this.speed = 7;
        this.sprintMult = 1.8;
        this.jumpForce = 10;
        this.sensitivity = 0.0018;
        this.gravity = -22;
        this.isSprinting = false;
        this.isPointerLocked = false;

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.interactRange = 5;
        this.nearResource = null;
        this.gatherProgress = 0;
        this.gatherTarget = null;

        // Torch point light
        this.torchLight = new THREE.PointLight(0xff9944, 0, 8);
        this.camera.add(this.torchLight);

        this._setupInput();
        this._setupPointerLock();
    }

    _setupPointerLock() {
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('click', () => {
            if (this.game.state === 'playing') canvas.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === canvas;
            const cf = document.getElementById('clickFocus');
            if (this.isPointerLocked) cf.classList.add('hidden');
            else if (this.game.state === 'playing') cf.classList.remove('hidden');
        });
        document.addEventListener('mousemove', e => {
            if (!this.isPointerLocked) return;
            this.yaw.rotation.y -= e.movementX * this.sensitivity;
            this.pitch.rotation.x -= e.movementY * this.sensitivity;
            this.pitch.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch.rotation.x));
        });
        document.addEventListener('mousedown', e => {
            if (!this.isPointerLocked) return;
            if (e.button === 0) this._startGather();
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 0) this._stopGather();
        });
    }

    _setupInput() {
        this.keys = this.game.keys;
        document.addEventListener('keydown', e => {
            if (this.game.state !== 'playing') return;
            if (e.code === 'Space' && !e.repeat && this.onGround) {
                const stam = this.game.survival?.stamina ?? 100;
                if (stam > 10) { this.velocity.y = this.jumpForce; this.game.survival?.drainStamina(10); }
            }
            if (e.code === 'KeyE') this._interact();
            if (e.code === 'Digit1') this.game.inventory?.selectHotbar(0);
            if (e.code === 'Digit2') this.game.inventory?.selectHotbar(1);
            if (e.code === 'Digit3') this.game.inventory?.selectHotbar(2);
            if (e.code === 'Digit4') this.game.inventory?.selectHotbar(3);
            if (e.code === 'Digit5') this.game.inventory?.selectHotbar(4);
            if (e.code === 'Digit6') this.game.inventory?.selectHotbar(5);
            if (e.code === 'Digit7') this.game.inventory?.selectHotbar(6);
            if (e.code === 'Digit8') this.game.inventory?.selectHotbar(7);
        });
        // Scroll hotbar
        document.addEventListener('wheel', e => {
            if (!this.isPointerLocked) return;
            const inv = this.game.inventory;
            if (!inv) return;
            inv.selectHotbar((inv.hotbarIndex + (e.deltaY > 0 ? 1 : -1) + 8) % 8);
        });
    }

    spawn() {
        // Find land spot near center
        let x = 10, z = 10;
        for (let r = 0; r < 50; r += 5) {
            const h = getTerrainHeight(x, z);
            if (h > 2) break;
            x += 5; z += 5;
        }
        const h = getTerrainHeight(x, z);
        this.yaw.position.set(x, h + this.height, z);
    }

    getPosition() { return this.yaw.position.clone(); }

    update(delta) {
        if (!this.isPointerLocked) return;

        const keys = this.game.keys;
        const surv = this.game.survival;
        const speedMult = (surv?.health ?? 100) < 20 ? 0.5 : 1;
        this.isSprinting = keys['ShiftLeft'] && (surv?.stamina ?? 100) > 0;
        const spd = this.speed * (this.isSprinting ? this.sprintMult : 1) * speedMult;

        // Movement direction relative to yaw
        const move = new THREE.Vector3();
        if (keys['KeyW']) move.z -= 1;
        if (keys['KeyS']) move.z += 1;
        if (keys['KeyA']) move.x -= 1;
        if (keys['KeyD']) move.x += 1;

        if (move.length() > 0) {
            move.normalize().applyQuaternion(this.yaw.quaternion);
            this.velocity.x = move.x * spd;
            this.velocity.z = move.z * spd;
            if (this.isSprinting) surv?.drainStamina(8 * delta);
        } else {
            this.velocity.x *= 0.85;
            this.velocity.z *= 0.85;
        }

        // Gravity
        this.velocity.y += this.gravity * delta;

        // Move
        this.yaw.position.addScaledVector(this.velocity, delta);

        // Terrain collision
        const terrY = getTerrainHeight(this.yaw.position.x, this.yaw.position.z);
        const minY = terrY + this.height;
        const waterY = 0.5 + this.height;
        const floorY = Math.max(minY, waterY);

        if (this.yaw.position.y <= floorY) {
            this.yaw.position.y = floorY;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        // Boundary clamp
        const half = 195;
        this.yaw.position.x = Math.max(-half, Math.min(half, this.yaw.position.x));
        this.yaw.position.z = Math.max(-half, Math.min(half, this.yaw.position.z));

        // Torch light
        const item = this.game.inventory?.getSelectedItem();
        const isNight = this.game.weather?.isNight();
        this.torchLight.intensity = (item?.id === 'torch' && isNight) ? 1.5 : 0;

        // Resource interaction preview
        this._checkInteractable();

        // Gather progress
        if (this.gatherTarget && this.gatherHeld) {
            this.gatherProgress += delta;
            const needed = this._gatherTime();
            if (this.gatherProgress >= needed) {
                this._finishGather();
            }
        }

        // Resize camera
        if (this.camera.aspect !== innerWidth / innerHeight) {
            this.camera.aspect = innerWidth / innerHeight;
            this.camera.updateProjectionMatrix();
        }
    }

    _checkInteractable() {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const world = this.game.world;
        const meshes = world.resources.filter(r => r.health > 0).map(r => r.mesh);

        const hits = this.raycaster.intersectObjects(meshes, true);
        const hint = document.getElementById('interactHint');
        const hintText = document.getElementById('hintText');

        if (hits.length > 0 && hits[0].distance < this.interactRange) {
            const hitMesh = hits[0].object.isGroup ? hits[0].object : (hits[0].object.parent?.isGroup ? hits[0].object.parent : hits[0].object);
            const res = world.resources.find(r => r.mesh === hitMesh || r.mesh === hits[0].object || hitMesh === r.mesh);
            if (res) {
                this.nearResource = res;
                const typeMap = { tree: 'Chop Tree 🪓', rock: 'Mine Rock ⛏️', bush: 'Pick Berries 🫐' };
                hintText.textContent = typeMap[res.type] || 'Interact';
                hint.classList.remove('hidden');
                return;
            }
        }
        this.nearResource = null;
        hint.classList.add('hidden');
    }

    _startGather() {
        if (this.nearResource) {
            this.gatherTarget = this.nearResource;
            this.gatherProgress = 0;
            this.gatherHeld = true;
        }
    }

    _stopGather() {
        this.gatherHeld = false;
        this.gatherProgress = 0;
        this.gatherTarget = null;
    }

    _gatherTime() {
        const res = this.gatherTarget;
        const inv = this.game.inventory;
        const sel = inv?.getSelectedItem();
        if (res.type === 'tree') return sel?.data?.tool === 'axe' ? 1.0 : 2.5;
        if (res.type === 'rock') return sel?.data?.tool === 'pickaxe' ? 1.0 : 3.0;
        if (res.type === 'bush') return 1.0;
        return 2.0;
    }

    _finishGather() {
        const res = this.gatherTarget;
        if (!res || res.health <= 0) { this._stopGather(); return; }

        const inv = this.game.inventory;
        res.health--;

        if (res.type === 'tree') {
            inv.addItem('wood', 2 + (inv.getSelectedItem()?.data?.tool === 'axe' ? 1 : 0));
            if (Math.random() < 0.3) inv.addItem('fiber', 1);
            this.game.ui.notify('🪵 +2 Wood');
        } else if (res.type === 'rock') {
            const qty = inv.getSelectedItem()?.data?.tool === 'pickaxe' ? 2 : 1;
            inv.addItem('stone', qty);
            if (Math.random() < 0.25) inv.addItem('flint', 1);
            this.game.ui.notify('🪨 +' + qty + ' Stone');
        } else if (res.type === 'bush') {
            if (res.berries > 0) { inv.addItem('berries', 1); res.berries--; this.game.ui.notify('🫐 +1 Berries'); }
        }

        this.game.survival.drainStamina(5);

        if (res.health <= 0) {
            // Extra drops on final hit
            if (res.type === 'tree') inv.addItem('wood', 3);
            if (res.type === 'rock') inv.addItem('stone', 2);
            this.game.world.removeResource(res);
            this._stopGather();
            return;
        }

        this.gatherProgress = 0; // reset for next hit
    }

    _interact() {
        if (this.nearResource) {
            this._startGather();
            setTimeout(() => this._stopGather(), 200);
        }

        // Check campfire nearby for cooking
        const pos = this.getPosition();
        if (this.game.world.isNearCampfire(pos)) {
            this.game.ui.notify('🔥 Near campfire - open crafting (C) to cook!', 'info');
        }

        // Use selected item
        const item = this.game.inventory?.getSelectedItem();
        if (item) {
            this.game.inventory.useSelectedItem();
        }
    }
}
