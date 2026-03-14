import * as THREE from 'three';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT } from './Chunk';
import { WorldGenerator } from './WorldGenerator';

const RENDER_DISTANCE = 2; // Performance target: 60 FPS

export class World {
    private scene: THREE.Scene;
    private chunks: Map<string, Chunk> = new Map();
    private materials: THREE.Material[];
    private generator: WorldGenerator;

    private loadQueue: { x: number, z: number }[] = [];
    private loadQueueKeys: Set<string> = new Set();
    private lastPlayerChunkX: number | null = null;
    private lastPlayerChunkZ: number | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.materials = this.createMaterials();
        this.generator = new WorldGenerator('default');
        (window as any).worldGenerator = this.generator;
    }

    private createMaterials(): THREE.Material[] {
        return [
            new THREE.MeshLambertMaterial({ color: 0x000000 }), // AIR
            new THREE.MeshLambertMaterial({ color: 0x228B22 }), // GRASS
            new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // DIRT
            new THREE.MeshLambertMaterial({ color: 0x808080 }), // STONE
            new THREE.MeshLambertMaterial({ color: 0x555555 }), // COBBLESTONE
            new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // WOOD
            new THREE.MeshLambertMaterial({ color: 0x228B22 }), // LEAVES
            new THREE.MeshLambertMaterial({ color: 0x0000FF, transparent: true, opacity: 0.6 }), // WATER
            new THREE.MeshLambertMaterial({ color: 0xc2b280 }), // SAND
            new THREE.MeshLambertMaterial({ color: 0x333333 }), // BEDROCK
            new THREE.MeshLambertMaterial({ color: 0xFFD700 }), // GOLD_BLOCK
            new THREE.MeshLambertMaterial({ color: 0xDDDDDD }), // IRON_BLOCK
            new THREE.MeshLambertMaterial({ color: 0x663300 }), // WOOD_PLANKS
            new THREE.MeshLambertMaterial({ color: 0x444444 }), // CRAFTING_TABLE
        ];
    }

    public update(playerPos: THREE.Vector3) {
        if (this.loadQueue.length > 0) {
            const next = this.loadQueue.shift()!;
            this.loadQueueKeys.delete(`${next.x},${next.z}`);
            this.loadChunk(next.x, next.z);
        }

        for (const chunk of this.chunks.values()) {
            if (chunk.isDirty) {
                chunk.buildMesh(this.materials);
                break;
            }
        }

        const pX = Math.floor(playerPos.x / CHUNK_WIDTH);
        const pZ = Math.floor(playerPos.z / CHUNK_WIDTH);

        if (this.lastPlayerChunkX === pX && this.lastPlayerChunkZ === pZ) return;
        this.lastPlayerChunkX = pX;
        this.lastPlayerChunkZ = pZ;

        const radiusSet = new Set<string>();
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const cx = pX + x;
                const cz = pZ + z;
                const key = `${cx},${cz}`;
                radiusSet.add(key);

                if (!this.chunks.has(key) && !this.loadQueueKeys.has(key)) {
                    this.loadQueue.push({ x: cx, z: cz });
                    this.loadQueueKeys.add(key);
                }
            }
        }

        for (const [key, chunk] of this.chunks.entries()) {
            if (!radiusSet.has(key)) {
                this.scene.remove(chunk.mesh);
                if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
                this.chunks.delete(key);
            }
        }
    }

    private loadChunk(x: number, z: number) {
        const chunk = new Chunk(x, z, this.scene);
        this.generator.generateChunk(chunk);
        chunk.buildMesh(this.materials);
        this.chunks.set(`${x},${z}`, chunk);
    }

    public getBlock(x: number, y: number, z: number): number {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_WIDTH);
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) return 0;
        return chunk.getBlock(x % CHUNK_WIDTH, y, z % CHUNK_WIDTH);
    }

    public setBlock(x: number, y: number, z: number, type: number, remote: boolean = false) {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_WIDTH);
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (chunk) {
            chunk.setBlock(x % CHUNK_WIDTH, y, z % CHUNK_WIDTH, type);
            if (!remote) {
                window.dispatchEvent(new CustomEvent('local_block_update', { detail: { x, y, z, type } }));
            }
        }
    }

    public resetSeed(seed: string) {
        for (const chunk of this.chunks.values()) {
            this.scene.remove(chunk.mesh);
            if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
        }
        this.chunks.clear();
        this.loadQueue = [];
        this.loadQueueKeys.clear();
        this.generator = new WorldGenerator(seed);
        (window as any).worldGenerator = this.generator;
        this.lastPlayerChunkX = null;
        this.lastPlayerChunkZ = null;
    }
}
