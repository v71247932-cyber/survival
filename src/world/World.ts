import * as THREE from 'three';
import { Chunk, CHUNK_WIDTH } from './Chunk';
import { WorldGenerator } from './WorldGenerator';
import { createBlockMaterials } from '../utils/TextureGenerator';
import { BlockType } from './BlockInfo';

const RENDER_DISTANCE = 3;

export class World {
    public chunks: Map<string, Chunk> = new Map();
    public scene: THREE.Scene;
    private generator: WorldGenerator;
    private materials: THREE.Material[];

    constructor(scene: THREE.Scene, seed?: number | string) {
        this.scene = scene;
        this.generator = new WorldGenerator(seed);
        this.materials = createBlockMaterials();
    }

    public resetSeed(seed: string) {
        this.generator = new WorldGenerator(seed);
        this.clearChunks();
    }

    public clearChunks() {
        for (const chunk of this.chunks.values()) {
            this.scene.remove(chunk.mesh);
            if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
        }
        this.chunks.clear();
    }

    private loadQueue: { x: number, z: number }[] = [];

    public update(playerPos: THREE.Vector3) {
        const pChunkX = Math.floor(playerPos.x / CHUNK_WIDTH);
        const pChunkZ = Math.floor(playerPos.z / CHUNK_WIDTH);

        const chunksInRadius = new Set<string>();

        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                if (x * x + z * z > RENDER_DISTANCE * RENDER_DISTANCE) continue;

                const cx = pChunkX + x;
                const cz = pChunkZ + z;
                const key = `${cx},${cz}`;
                chunksInRadius.add(key);

                if (!this.chunks.has(key) && !this.loadQueue.some(q => q.x === cx && q.z === cz)) {
                    this.loadQueue.push({ x: cx, z: cz });
                }
            }
        }

        // Process only 1 chunk per frame to maintain high FPS
        if (this.loadQueue.length > 0) {
            const next = this.loadQueue.shift()!;
            this.loadChunk(next.x, next.z);
        }

        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksInRadius.has(key)) {
                this.scene.remove(chunk.mesh);
                if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
                this.chunks.delete(key);
            } else if (chunk.isDirty) {
                // Optimize: Rebuild mesh if dirty
                chunk.buildMesh(this.materials);
            }
        }
    }

    private loadChunk(dx: number, dz: number) {
        const chunk = new Chunk(dx, dz);
        this.generator.generateChunk(chunk);
        chunk.buildMesh(this.materials);
        this.scene.add(chunk.mesh);
        this.chunks.set(`${dx},${dz}`, chunk);
    }

    public getBlock(x: number, y: number, z: number): BlockType {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_WIDTH);
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) return BlockType.AIR;

        let lx = x - cx * CHUNK_WIDTH;
        let lz = z - cz * CHUNK_WIDTH;
        if (lx < 0) lx += CHUNK_WIDTH;
        if (lz < 0) lz += CHUNK_WIDTH;

        return chunk.getBlock(lx, Math.floor(y), lz);
    }

    public setBlock(x: number, y: number, z: number, type: BlockType, skipEvent: boolean = false) {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_WIDTH);
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) return;

        let lx = Math.floor(x - cx * CHUNK_WIDTH);
        let lz = Math.floor(z - cz * CHUNK_WIDTH);
        if (lx < 0) lx += CHUNK_WIDTH;
        if (lz < 0) lz += CHUNK_WIDTH;

        chunk.setBlock(lx, Math.floor(y), lz, type);
        // buildMesh is now called in update() if chunk is dirty

        // Dispatch event for network
        if (!skipEvent) {
            const event = new CustomEvent('local_block_update', {
                detail: { x, y, z, type }
            });
            window.dispatchEvent(event);
        }
    }
}
