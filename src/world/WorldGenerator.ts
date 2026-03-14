import { createNoise2D, createNoise3D } from 'simplex-noise';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT } from './Chunk';
import { BlockType } from './BlockInfo';
import { StructureGenerator } from './StructureGenerator';

export class WorldGenerator {
    private noise2D = createNoise2D();
    private noise3D = createNoise3D();
    private seedOffset: number;

    constructor(seed?: number | string) {
        if (typeof seed === 'string') {
            this.seedOffset = this.hashString(seed);
        } else {
            this.seedOffset = seed || Math.random() * 10000;
        }
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) % 10000;
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

                // Base terrain height and biomes
                const e = 1 * this.noise(1 * worldX, 1 * worldZ, 0.005)
                    + 0.5 * this.noise(2 * worldX, 2 * worldZ, 0.01)
                    + 0.25 * this.noise(4 * worldX, 4 * worldZ, 0.02);

                // Map e from roughly -1..1 to height
                const height = Math.floor(40 + (e + 1) * 20);
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
                        // Caves using 3D noise
                        const caveNoise = this.noise3D(worldX * 0.05, y * 0.05, worldZ * 0.05);
                        const largeCaveNoise = this.noise3D(worldX * 0.015, y * 0.02, worldZ * 0.015);

                        if (caveNoise > 0.4 || largeCaveNoise > 0.45) {
                            chunk.setBlock(x, y, z, BlockType.AIR);
                        } else {
                            // Ores
                            const oreNoise = this.noise3D(worldX * 0.1, y * 0.1, worldZ * 0.1);
                            if (oreNoise > 0.7) {
                                if (y < 20 && Math.random() < 0.3) chunk.setBlock(x, y, z, BlockType.GOLD_BLOCK);
                                else if (y < 40) chunk.setBlock(x, y, z, BlockType.IRON_BLOCK);
                                else chunk.setBlock(x, y, z, BlockType.STONE);
                            } else {
                                chunk.setBlock(x, y, z, BlockType.STONE);
                            }
                        }
                    }
                }

                // Trees
                if (height > 44 && moisture >= -0.2 && Math.random() < 0.01) {
                    this.generateTree(chunk, x, height + 1, z);
                }
            }
        }

        // Generate structures based on chunk terrain
        const structGen = new StructureGenerator(this.seedOffset);
        structGen.generateStructures(chunk, heightmap);
    }

    private generateTree(chunk: Chunk, x: number, y: number, z: number) {
        const height = 4 + Math.floor(Math.random() * 3);
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
                        if (absX === 2 && absZ === 2 && Math.random() < 0.3) continue;
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
