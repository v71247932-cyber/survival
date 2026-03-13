import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { World } from '../world/World';
import { BlockType, BlockTransparent } from '../world/BlockInfo';
import { InventoryManager } from '../gameplay/InventoryManager';
import { SurvivalSystem } from '../gameplay/SurvivalSystem';
import { getBlockTypeFromItem, getItemFromBlockType, ItemID } from '../gameplay/Items';

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

    // Physics properties
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

        // Find highest block to spawn
        let spawnY = 120;
        while (spawnY > 0 && world.getBlock(0, spawnY - 1, 0) === BlockType.AIR) spawnY--;
        this.camera.position.set(0, spawnY + this.normalHeight, 0);

        domElement.addEventListener('mousedown', (e) => {
            if (!this.controls.isLocked) {
                // We use click to lock, handle locking here or elsewhere.
                // It's usually better to let a dedicated "Play" button lock it, but for now:
                this.controls.lock();
            } else {
                if (e.button === 0) {
                    this.breakBlock(); // Left click
                } else if (e.button === 2) {
                    this.placeBlock(); // Right click
                }
            }
        });

        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    private onKeyDown(event: KeyboardEvent) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': this.moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': this.moveBackward = true; break;
            case 'ArrowRight':
            case 'KeyD': this.moveRight = true; break;
            case 'Space':
                if (this.onGround) this.velocity.y = this.jumpVelocity;
                break;
            case 'ShiftLeft': this.isRunning = true; break;
            case 'KeyC':
            case 'ControlLeft': this.isCrouching = true; break;
        }
    }

    private onKeyUp(event: KeyboardEvent) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': this.moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': this.moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': this.moveRight = false; break;
            case 'ShiftLeft': this.isRunning = false; break;
            case 'KeyC':
            case 'ControlLeft': this.isCrouching = false; break;
        }
    }

    public update(delta: number) {
        if (!this.controls.isLocked) return;

        // Apply gravity
        this.velocity.y -= this.gravity * delta;

        // Local movement vector relative to camera
        const localMove = new THREE.Vector3(
            Number(this.moveRight) - Number(this.moveLeft),
            0,
            Number(this.moveBackward) - Number(this.moveForward)
        );
        localMove.normalize();

        const currentSpeed = this.isCrouching ? this.speed * 0.5 : (this.isRunning ? this.speed * this.runMultiplier : this.speed);

        // Apply camera yaw
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);
        euler.x = 0; // Ignore pitch to keep movement horizontal
        euler.z = 0;

        localMove.applyEuler(euler);

        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            this.velocity.x += localMove.x * currentSpeed * delta * 15;
            this.velocity.z += localMove.z * currentSpeed * delta * 15;
        }

        // Friction
        const friction = 10.0;
        this.velocity.x -= this.velocity.x * friction * delta;
        this.velocity.z -= this.velocity.z * friction * delta;

        // Apply movement & collision
        this.camera.position.x += this.velocity.x * delta;
        this.checkCollision('x');

        this.camera.position.z += this.velocity.z * delta;
        this.checkCollision('z');

        this.camera.position.y += this.velocity.y * delta;
        this.checkCollision('y');

    }

    private checkCollision(axis: 'x' | 'y' | 'z') {
        const pos = this.camera.position;
        // Collision bounding box 
        const w = 0.3; // player width radius
        const h = this.isCrouching ? this.crouchHeight : this.normalHeight;

        // Check blocks intersecting bounding box
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
                        // Collided
                        if (axis === 'y') {
                            if (this.velocity.y < 0) {
                                // Hit ground
                                pos.y = y + 1 + h;
                                this.velocity.y = 0;
                                this.onGround = true;
                            } else {
                                // Hit ceiling
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
                        return; // Resolves first collision found on this axis
                    }
                }
            }
        }
        if (axis === 'y') this.onGround = false;
    }

    public breakBlock() {
        // Raycast
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const reach = 5;
        let p = raycaster.ray.origin;
        let d = raycaster.ray.direction;

        for (let i = 0; i < reach; i += 0.1) {
            const bx = Math.floor(p.x + d.x * i);
            const by = Math.floor(p.y + d.y * i);
            const bz = Math.floor(p.z + d.z * i);

            const b = this.world.getBlock(bx, by, bz);
            if (b !== BlockType.AIR && b !== BlockType.WATER) {
                if (b === BlockType.BEDROCK) return; // Cannot break bedrock

                // Track tool durability
                if (this.inventory.getSelectedSlot().item >= 100) {
                    this.inventory.damageSelectedTool();
                }

                // Add to inventory before breaking
                const item = getItemFromBlockType(b);
                if (item !== ItemID.NONE) {
                    this.inventory.addItem(item, 1);
                }

                // Break block
                this.world.setBlock(bx, by, bz, BlockType.AIR);
                return;
            }
        }
    }

    public placeBlock() {
        // Raycast
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
            if (b !== BlockType.AIR && b !== BlockType.WATER) {
                if (lastAirPos) {
                    const selected = this.inventory.getSelectedSlot();
                    const blockToPlace = getBlockTypeFromItem(selected.item);

                    if (blockToPlace !== BlockType.AIR) {
                        // Check if block intersects player
                        const pPos = this.camera.position;
                        const w = 0.4;
                        const h = this.isCrouching ? this.crouchHeight : this.normalHeight;

                        const intersects = (
                            lastAirPos.x >= Math.floor(pPos.x - w) && lastAirPos.x <= Math.floor(pPos.x + w) &&
                            lastAirPos.z >= Math.floor(pPos.z - w) && lastAirPos.z <= Math.floor(pPos.z + w) &&
                            lastAirPos.y >= Math.floor(pPos.y - h) && lastAirPos.y <= Math.floor(pPos.y)
                        );

                        if (!intersects) {
                            this.world.setBlock(lastAirPos.x, lastAirPos.y, lastAirPos.z, blockToPlace);
                            this.inventory.consumeSelectedSlot();
                        }
                    }
                }
                return;
            }
            lastAirPos = { x: bx, y: by, z: bz };
        }
    }
}
