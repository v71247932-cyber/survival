import * as THREE from 'three';
import { World } from '../world/World';
import { Player } from './Player';

export class Mob {
    public mesh: THREE.Mesh;
    public isHostile: boolean;
    private world: World;
    private targetPlayer: Player | null;

    private velocity = new THREE.Vector3();
    private speed = 3.0;
    private gravity = 25.0;

    private nextWanderTime = 0;
    private targetWanderAngle = 0;

    constructor(world: World, position: THREE.Vector3, isHostile: boolean, player: Player | null = null) {
        this.world = world;
        this.isHostile = isHostile;
        this.targetPlayer = player;

        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const material = new THREE.MeshLambertMaterial({ color: isHostile ? 0xff0000 : 0x00ff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }

    public update(delta: number) {
        this.velocity.y -= this.gravity * delta;

        let dx = 0;
        let dz = 0;

        if (this.isHostile && this.targetPlayer && this.mesh.position.distanceTo(this.targetPlayer.camera.position) < 15) {
            // Chase player
            const dir = this.targetPlayer.camera.position.clone().sub(this.mesh.position).setY(0).normalize();
            dx = dir.x;
            dz = dir.z;
        } else {
            // Wander
            this.nextWanderTime -= delta;
            if (this.nextWanderTime <= 0) {
                this.nextWanderTime = 2 + Math.random() * 4;
                if (Math.random() < 0.5) {
                    this.targetWanderAngle = Math.random() * Math.PI * 2;
                } else {
                    this.targetWanderAngle = -1; // stop
                }
            }

            if (this.targetWanderAngle !== -1) {
                dx = Math.sin(this.targetWanderAngle);
                dz = Math.cos(this.targetWanderAngle);
            }
        }

        this.velocity.x = dx * this.speed;
        this.velocity.z = dz * this.speed;

        this.mesh.position.x += this.velocity.x * delta;
        // Collision (simplified AABB check)
        this.mesh.position.y += this.velocity.y * delta;

        if (this.mesh.position.y < 0) this.mesh.position.y = 100; // Reset if fallen out

        // Simple floor clamping based on block below
        const bx = Math.floor(this.mesh.position.x);
        const by = Math.floor(this.mesh.position.y - 0.9);
        const bz = Math.floor(this.mesh.position.z);

        if (this.world.getBlock(bx, by, bz) !== 0) { // Not air
            this.velocity.y = 0;
            this.mesh.position.y = by + 1 + 0.9;
        }

        this.mesh.position.z += this.velocity.z * delta;
    }
}

export class EntityManager {
    private mobs: Mob[] = [];
    private scene: THREE.Scene;
    private world: World;
    private player: Player;

    constructor(scene: THREE.Scene, world: World, player: Player) {
        this.scene = scene;
        this.world = world;
        this.player = player;
    }

    public update(delta: number) {
        if (Math.random() < 0.005 && this.mobs.length < 5) {
            this.spawnMob();
        }

        for (const mob of this.mobs) {
            mob.update(delta);
        }
    }

    private spawnMob() {
        const px = this.player.camera.position.x;
        const pz = this.player.camera.position.z;

        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 10;

        const sx = px + Math.cos(angle) * dist;
        const sz = pz + Math.sin(angle) * dist;
        const sy = this.player.camera.position.y + 10; // Drop from above

        const isHostile = Math.random() < 0.3; // 30% hostile
        const mob = new Mob(this.world, new THREE.Vector3(sx, sy, sz), isHostile, this.player);

        this.scene.add(mob.mesh);
        this.mobs.push(mob);
    }
}
