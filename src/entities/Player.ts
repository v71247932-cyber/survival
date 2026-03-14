import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World } from '../world/World';
import { BlockType, BlockTransparent } from '../world/BlockInfo';
import { InventoryManager } from '../gameplay/InventoryManager';
import { SurvivalSystem } from '../gameplay/SurvivalSystem';
import { getBlockTypeFromItem, getItemFromBlockType, ItemID } from '../gameplay/Items';
import { createBreakMaterials } from '../utils/TextureGenerator';

export class Player {
    public camera: THREE.PerspectiveCamera;
    public controls: PointerLockControls;
    public velocity = new THREE.Vector3();
    public direction = new THREE.Vector3();

    public inventory = new InventoryManager();
    public survival = new SurvivalSystem();

    private world: World;
    private onGround = false;
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private isRunning = false;
    private isCrouching = false;
    private isBreaking = false;
    private breakTarget: THREE.Vector3 | null = null;
    private breakProgress = 0;
    private breakTime = 0.6;

    private breakMaterials: THREE.Material[];
    private breakOverlay: THREE.Mesh;

    private speed = 10.0;
    private runMultiplier = 1.5;
    private jumpVelocity = 8.0;
    private gravity = 25.0;
    private crouchHeight = 1.2;
    private normalHeight = 1.8;

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, world: World) {
        this.camera = camera;
        this.world = world;
        this.controls = new PointerLockControls(camera, domElement);

        this.camera.position.set(0, 80, 0);

        this.breakMaterials = createBreakMaterials();
        this.breakOverlay = new THREE.Mesh(new THREE.BoxGeometry(1.002, 1.002, 1.002), this.breakMaterials[0]);
        this.breakOverlay.visible = false;
        this.breakOverlay.frustumCulled = false;
        this.world.scene.add(this.breakOverlay);

        domElement.addEventListener('mousedown', (e) => {
            if (!this.controls.isLocked) {
                const inv = document.getElementById('inventory-screen');
                if (inv && inv.style.display !== 'none') return;
                this.controls.lock();
            } else {
                if (e.button === 0) this.isBreaking = true;
                else if (e.button === 2) this.placeBlock();
            }
        });

        domElement.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isBreaking = false;
                this.resetMining();
            }
        });

        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    public setSpawn(x: number, z: number) {
        this.camera.position.set(x, 80, z);
        this.velocity.set(0, 0, 0);
        this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = this.isRunning = this.isCrouching = false;
    }

    private onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space': if (this.onGround) this.velocity.y = this.jumpVelocity; break;
            case 'ShiftLeft': this.isRunning = true; break;
            case 'KeyC': this.isCrouching = true; break;
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyD': this.moveRight = false; break;
            case 'ShiftLeft': this.isRunning = false; break;
            case 'KeyC': this.isCrouching = false; break;
        }
    }

    public update(delta: number) {
        // SPAWN PROTECTION: Don't fall if no block below yet
        const blockBelow = this.world.getBlock(
            Math.floor(this.camera.position.x),
            Math.floor(this.camera.position.y - 10), // Look ahead
            Math.floor(this.camera.position.z)
        );

        if (this.camera.position.y > 70 && blockBelow === BlockType.AIR) {
            this.velocity.y = 0; // Hover while waiting for chunk
        } else {
            this.velocity.y -= this.gravity * delta;
        }

        if (this.velocity.y < -50) this.velocity.y = -50;

        if (this.controls.isLocked) {
            if (this.isBreaking) this.updateMining(delta);
            else this.resetMining();

            const localMove = new THREE.Vector3(
                Number(this.moveRight) - Number(this.moveLeft),
                0,
                Number(this.moveBackward) - Number(this.moveForward)
            );
            localMove.normalize();
            const currentSpeed = this.isCrouching ? this.speed * 0.5 : (this.isRunning ? this.speed * this.runMultiplier : this.speed);
            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(this.camera.quaternion);
            euler.x = 0;
            euler.z = 0;
            localMove.applyEuler(euler);

            if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
                this.velocity.x += localMove.x * currentSpeed * delta * 15;
                this.velocity.z += localMove.z * currentSpeed * delta * 15;
            }
        } else {
            this.isBreaking = false;
            this.resetMining();
        }

        const friction = 10.0;
        this.velocity.x -= this.velocity.x * friction * delta;
        this.velocity.z -= this.velocity.z * friction * delta;

        this.camera.position.x += this.velocity.x * delta;
        this.checkCollision('x');
        this.camera.position.z += this.velocity.z * delta;
        this.checkCollision('z');
        this.camera.position.y += this.velocity.y * delta;
        this.checkCollision('y');
    }

    private checkCollision(axis: 'x' | 'y' | 'z') {
        const pos = this.camera.position;
        const w = 0.3;
        const h = this.isCrouching ? this.crouchHeight : this.normalHeight;

        const minX = Math.floor(pos.x - w);
        const maxX = Math.floor(pos.x + w);
        const minY = Math.floor(pos.y - h);
        const maxY = Math.floor(pos.y);
        const minZ = Math.floor(pos.z - w);
        const maxZ = Math.floor(pos.z + w);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.world.getBlock(x, y, z);
                    if (block !== BlockType.AIR && !BlockTransparent[block] || block === BlockType.LEAVES) {
                        if (axis === 'y') {
                            if (this.velocity.y < 0) {
                                pos.y = y + 1 + h;
                                this.velocity.y = 0;
                                this.onGround = true;
                            } else {
                                pos.y = y - 0.01;
                                this.velocity.y = 0;
                            }
                        } else if (axis === 'x') {
                            if (this.velocity.x > 0) pos.x = x - w - 0.01;
                            else pos.x = x + 1 + w + 0.01;
                            this.velocity.x = 0;
                        } else if (axis === 'z') {
                            if (this.velocity.z > 0) pos.z = z - w - 0.01;
                            else pos.z = z + 1 + w + 0.01;
                            this.velocity.z = 0;
                        }
                        return;
                    }
                }
            }
        }
        if (axis === 'y') this.onGround = false;
    }

    private updateMining(dt: number) {
        if (!this.isBreaking) return;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = raycaster.intersectObjects(this.world.scene.children);
        if (intersects.length > 0 && intersects[0].distance < 5) {
            const intersect = intersects[0];
            const pos = intersect.point.clone().add(intersect.face!.normal.clone().multiplyScalar(-0.5));
            const bx = Math.floor(pos.x);
            const by = Math.floor(pos.y);
            const bz = Math.floor(pos.z);
            const targetBlock = this.world.getBlock(bx, by, bz);
            if (targetBlock === BlockType.AIR || targetBlock === BlockType.BEDROCK || targetBlock === BlockType.WATER) {
                this.resetMining(); return;
            }
            if (!this.breakTarget || !this.breakTarget.equals(new THREE.Vector3(bx, by, bz))) {
                this.breakTarget = new THREE.Vector3(bx, by, bz);
                this.breakProgress = 0;
                this.breakTime = 0.5;
            }
            this.breakProgress += dt;
            this.breakOverlay.visible = true;
            this.breakOverlay.position.set(bx + 0.5, by + 0.5, bz + 0.5);
            const stage = Math.min(9, Math.floor((this.breakProgress / this.breakTime) * 10));
            this.breakOverlay.material = this.breakMaterials[stage];
            if (this.breakProgress >= this.breakTime) {
                this.world.setBlock(bx, by, bz, BlockType.AIR);
                this.resetMining();
            }
        } else this.resetMining();
    }

    private resetMining() {
        this.breakTarget = null;
        this.breakProgress = 0;
        if (this.breakOverlay) this.breakOverlay.visible = false;
    }

    public placeBlock() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const reach = 5;
        let p = raycaster.ray.origin;
        let d = raycaster.ray.direction;
        let lastAirPos = null;
        for (let i = 0; i < reach; i += 0.1) {
            const bx = Math.floor(p.x + d.x * i);
            const by = Math.floor(p.y + d.y * i);
            const bz = Math.floor(p.z + d.z * i);
            const b = this.world.getBlock(bx, by, bz);
            if (b !== BlockType.AIR) {
                if (lastAirPos) {
                    const blockToPlace = getBlockTypeFromItem(this.inventory.getSelectedSlot().item);
                    if (blockToPlace !== BlockType.AIR) {
                        this.world.setBlock(lastAirPos.x, lastAirPos.y, lastAirPos.z, blockToPlace);
                        this.inventory.consumeSelectedSlot();
                    }
                }
                return;
            }
            lastAirPos = { x: bx, y: by, z: bz };
        }
    }
}
