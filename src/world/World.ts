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
    private materials: THREE.Material[];

    constructor(scene: THREE.Scene, seed?: number) {
        this.scene = scene;
        this.generator = new WorldGenerator(seed);
        this.materials = createBlockMaterials();
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

    public setBlock(x: number, y: number, z: number, type: BlockType) {
        const cx = Math.floor(x / CHUNK_WIDTH);
        const cz = Math.floor(z / CHUNK_WIDTH);
        const chunk = this.chunks.get(`${cx},${cz}`);
        if (!chunk) return;

        let lx = Math.floor(x - cx * CHUNK_WIDTH);
        let lz = Math.floor(z - cz * CHUNK_WIDTH);
        if (lx < 0) lx += CHUNK_WIDTH;
        if (lz < 0) lz += CHUNK_WIDTH;

        chunk.setBlock(lx, Math.floor(y), lz, type);
        chunk.buildMesh(this.materials);
    }
}
