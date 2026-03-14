import * as THREE from 'three';
import { World } from '../world/World';
import { Player } from './Player';
import { RemotePlayer } from './RemotePlayer';

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
    private remotePlayers: Map<string, RemotePlayer> = new Map();
    private scene: THREE.Scene;
    private world: World;
    private player: Player;

    constructor(scene: THREE.Scene, world: World, player: Player) {
        this.scene = scene;
        this.world = world;
        this.player = player;
    }

    public update(delta: number, isHost: boolean) {
        // Only spawn mobs if in singleplayer or if this client is the "host"
        if (isHost && Math.random() < 0.005 && this.mobs.length < 5) {
            this.spawnMob();
        }

        for (const mob of this.mobs) {
            mob.update(delta);
        }

        for (const remotePlayer of this.remotePlayers.values()) {
            remotePlayer.update(delta);
        }
    }

    public getMobs() {
        return this.mobs;
    }

    public getRemotePlayerIds(): string[] {
        return Array.from(this.remotePlayers.keys());
    }

    // --- Remote Players ---

    public addRemotePlayer(id: string, username: string, pos: { x: number, y: number, z: number }) {
        if (!this.remotePlayers.has(id)) {
            const rp = new RemotePlayer(id, username, pos);
            this.scene.add(rp.group);
            this.remotePlayers.set(id, rp);
        }
    }

    public updateRemotePlayer(id: string, pos: { x: number, y: number, z: number }, rot: { y: number }) {
        const rp = this.remotePlayers.get(id);
        if (rp) {
            rp.setTarget(pos, rot);
        }
    }

    public removeRemotePlayer(id: string) {
        const rp = this.remotePlayers.get(id);
        if (rp) {
            this.scene.remove(rp.group);
            rp.dispose();
            this.remotePlayers.delete(id);
        }
    }

    public clearRemotePlayers() {
        for (const rp of this.remotePlayers.values()) {
            this.scene.remove(rp.group);
            rp.dispose();
        }
        this.remotePlayers.clear();

        // Also clear mobs if we are joining a server (mobs should come from host)
        for (const mob of this.mobs) {
            this.scene.remove(mob.mesh);
        }
        this.mobs = [];
    }

    // --- Networked Mobs ---

    public addNetworkMob(id: string, isHostile: boolean, pos: { x: number, y: number, z: number }) {
        // Check if mob already exists
        if (this.mobs.some(m => (m as any).id === id)) return;

        const mob = new Mob(this.world, new THREE.Vector3(pos.x, pos.y, pos.z), isHostile, this.player);
        (mob as any).id = id;
        this.scene.add(mob.mesh);
        this.mobs.push(mob);
    }

    public updateNetworkMob(id: string, pos: { x: number, y: number, z: number }) {
        const mob = this.mobs.find(m => (m as any).id === id);
        if (mob) {
            mob.mesh.position.set(pos.x, pos.y, pos.z);
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

        // Generate a simple unique ID for the mob
        (mob as any).id = `mob_${Math.random().toString(36).substr(2, 9)}`;

        this.scene.add(mob.mesh);
        this.mobs.push(mob);

        // Notify network
        const event = new CustomEvent('local_mob_spawn', { detail: mob });
        window.dispatchEvent(event);
    }
}
