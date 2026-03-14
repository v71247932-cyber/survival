import { createNoise2D, createNoise3D } from 'simplex-noise';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT } from './Chunk';
import { BlockType } from './BlockInfo';
import { StructureGenerator } from './StructureGenerator';

export class WorldGenerator {
    private noise2D: (x: number, y: number) => number;
    private noise3D: (x: number, y: number, z: number) => number;
    private seedOffset: number;
    private prng: () => number;

    constructor(seed?: number | string) {
        if (typeof seed === 'string') {
            this.seedOffset = this.hashString(seed);
        } else {
            this.seedOffset = seed || Math.floor(Math.random() * 10000);
        }

        // Use a seeded PRNG for deterministic noise and random numbers
        this.prng = this.createPRNG(this.seedOffset);
        this.noise2D = createNoise2D(this.prng);
        this.noise3D = createNoise3D(this.prng);
    }

    private createPRNG(seed: number) {
        let t = (seed % 2147483647) + 0x6D2B79F5;
        return () => {
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    public generateChunk(chunk: Chunk) {
        const dx = chunk.dx * CHUNK_WIDTH;
        const dz = chunk.dz * CHUNK_WIDTH;
        const heightmap: number[][] = [];

        for (let x = 0; x < CHUNK_WIDTH; x++) {
            heightmap[x] = [];
            for (let z = 0; z < CHUNK_WIDTH; z++) {
                const worldX = dx + x;
                const worldZ = dz + z;

                // Base terrain height - simplified to 1 octave for 60+ FPS on live site
                const e = this.noise(worldX, worldZ, 0.012);

                // Map e from roughly -1..1 to height
                const height = Math.floor(48 + e * 12);
                heightmap[x][z] = height;

                // Humidity/temperature for biomes
                const moisture = this.noise(worldX, worldZ, 0.003); // -1 to 1

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    if (y === 0) {
                        chunk.setBlock(x, y, z, BlockType.BEDROCK);
                        continue;
                    }
                    if (y > height) {
                        if (y <= 42) {
                            chunk.setBlock(x, y, z, BlockType.WATER);
                        } else {
                            chunk.setBlock(x, y, z, BlockType.AIR);
                        }
                    } else if (y === height) {
                        if (y <= 44) {
                            chunk.setBlock(x, y, z, BlockType.SAND);
                        } else {
                            if (moisture < -0.2 && y < 60) chunk.setBlock(x, y, z, BlockType.SAND); // Desert
                            else chunk.setBlock(x, y, z, BlockType.GRASS); // Plains/Forest
                        }
                    } else if (y > height - 4) {
                        if (y <= 44) {
                            chunk.setBlock(x, y, z, BlockType.SAND);
                        } else {
                            if (moisture < -0.2 && y < 60) chunk.setBlock(x, y, z, BlockType.SAND);
                            else chunk.setBlock(x, y, z, BlockType.DIRT);
                        }
                    } else {
                        // Very simplified stone/caves (no 3D noise for now to save 60k calls/frame)
                        chunk.setBlock(x, y, z, BlockType.STONE);
                    }
                }

                // Trees
                if (height > 44 && moisture >= -0.2 && this.prng() < 0.01) {
                    this.generateTree(chunk, x, height + 1, z);
                }
            }
        }

        // Generate structures based on chunk terrain
        const structGen = new StructureGenerator(this.seedOffset);
        structGen.generateStructures(chunk, heightmap);
    }

    private generateTree(chunk: Chunk, x: number, y: number, z: number) {
        const height = 4 + Math.floor(this.prng() * 3);
        // Trunk
        for (let i = 0; i < height; i++) {
            chunk.setBlock(x, y + i, z, BlockType.WOOD);
        }
        // Leaves
        for (let lx = -2; lx <= 2; lx++) {
            for (let ly = height - 3; ly <= height + 1; ly++) {
                for (let lz = -2; lz <= 2; lz++) {
                    const absX = Math.abs(lx);
                    const absZ = Math.abs(lz);
                    const dist = absX + absZ;

                    // Create a fuller, slightly rounded cube for the canopy
                    if (ly >= height) {
                        // Top part of canopy (narrower)
                        if (dist > 2) continue;
                    } else if (ly >= height - 1) {
                        // Middle part (full width)
                        if (absX === 2 && absZ === 2 && this.prng() < 0.3) continue;
                    } else {
                        // Bottom part (wider but with corner cuts)
                        if (dist > 3) continue;
                    }

                    if (chunk.getBlock(x + lx, y + ly, z + lz) === BlockType.AIR) {
                        chunk.setBlock(x + lx, y + ly, z + lz, BlockType.LEAVES);
                    }
                }
            }
        }
    }

    private noise(x: number, z: number, scale: number) {
        return this.noise2D(x * scale + this.seedOffset, z * scale + this.seedOffset);
    }
}
