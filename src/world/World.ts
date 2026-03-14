import * as THREE from 'three';
import { Chunk, CHUNK_WIDTH } from './Chunk';
import { WorldGenerator } from './WorldGenerator';
import { createBlockMaterials } from '../utils/TextureGenerator';
import { BlockType } from './BlockInfo';

const RENDER_DISTANCE = 4;

export class World {
    public chunks: Map<string, Chunk> = new Map();
    public scene: THREE.Scene;
    private generator: WorldGenerator;
    public materials: THREE.Material[];
    public modifiedBlocks: Map<string, BlockType> = new Map();

    constructor(scene: THREE.Scene, seed?: number | string) {
        this.scene = scene;
        this.generator = new WorldGenerator(seed);
        this.materials = createBlockMaterials();
    }

    public getSaveData(): { [key: string]: number } {
        const obj: { [key: string]: number } = {};
        this.modifiedBlocks.forEach((val, key) => {
            obj[key] = val;
        });
        return obj;
    }

    public loadSaveData(data: { [key: string]: number }) {
        this.modifiedBlocks.clear();
        for (const key in data) {
            this.modifiedBlocks.set(key, data[key]);
        }
        this.clearChunks();
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

                if (!this.chunks.has(key)) {
                    this.loadChunk(cx, cz);
                }
            }
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

        // Apply modifications
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
                for (let y = 0; y < 128; y++) {
                    const worldX = dx * 16 + x;
                    const worldZ = dz * 16 + z;
                    const key = `${worldX},${y},${worldZ}`;
                    if (this.modifiedBlocks.has(key)) {
                        chunk.setBlock(x, y, z, this.modifiedBlocks.get(key)!);
                    }
                }
            }
        }

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

        // Track modification
        const key = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
        this.modifiedBlocks.set(key, type);

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
